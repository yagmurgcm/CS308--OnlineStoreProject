import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../product/entities/product.entity';
import { Order } from './order.entity';
import { OrderDetail } from './order-detail.entity';
import { CartService } from '../cart/cart.service';
import { UsersService } from '../users/users.service';
import { ProductVariant } from '../product/product-variant.entity';
import { Cart } from '../cart/entities/cart.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(OrderDetail)
    private readonly detailRepo: Repository<OrderDetail>,

    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,

    private readonly cartService: CartService,
    private readonly usersService: UsersService,
  ) {}

  // ---------------------------------------
  // Checkout (clean version)
  // ---------------------------------------
async checkout(userId: number) {
  const user = await this.usersService.findById(userId);
  if (!user) {
    throw new NotFoundException('User not found');
  }

  let createdOrder: Order | null = null;

  await this.orderRepo.manager.transaction(async (manager) => {
    const orderRepository = manager.getRepository(Order);
    const detailRepository = manager.getRepository(OrderDetail);
    const cartRepository = manager.getRepository(Cart);
    const variantRepository = manager.getRepository(ProductVariant);

    // 1) Kullanıcının sepetini FULL relations ile çek
    console.log('CHECKOUT STEP 1: loading cart for user', userId);
    const cart = await cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.variant', 'items.variant.product'],
      order: { items: { id: 'ASC' } },
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }
    console.log(
      'CHECKOUT STEP 1.5: cart loaded ->',
      cart.id,
      'items:',
      cart.items.length,
    );

    // 2) Order nesnesini oluştur
    const order = orderRepository.create({
      user,
      status: 'pending',
      totalPrice: 0,
    });

    console.log('CHECKOUT STEP 2: computing total price');

    let totalPrice = 0;

    for (const item of cart.items) {
      const variant = await variantRepository.findOne({
        where: { id: item.variant.id },
        relations: ['product'],
      });

      if (!variant || !variant.product) {
        throw new NotFoundException(
          `Variant ${item.variant.id} or its product not found`,
        );
      }

      const price = Number(variant.price);
      const lineTotal = price * item.quantity;
      totalPrice += lineTotal;
    }

    order.totalPrice = totalPrice;

    // 3) Order'ı kaydet
    console.log('CHECKOUT STEP 3: saving order...');
    await orderRepository.save(order);
    console.log('CHECKOUT STEP 3 DONE: order saved with id', order.id);

    // 4) OrderDetail kayıtlarını ekle
    console.log('CHECKOUT STEP 4: inserting details...');

    const detailEntities = cart.items.map((item) =>
      detailRepository.create({
        order: { id: order.id } as Order,
        product: { id: item.variant.product.id } as Product,
        quantity: item.quantity,
        price: Number(item.variant.price),
        lineTotal: Number(item.variant.price) * item.quantity,
      }),
    );

    await detailRepository.insert(detailEntities);
    console.log('CHECKOUT STEP 4 DONE: inserted', detailEntities.length);

    // 5) Sepeti temizle
    console.log('CHECKOUT STEP 5: clearing cart for user', userId);
    await this.cartService.clear(userId);

    // 6) Geri dönerken relations'lı haliyle order'ı çek
    createdOrder = await orderRepository.findOne({
      where: { id: order.id },
      relations: ['details', 'details.product', 'user'],
    });
    console.log(
      'CHECKOUT STEP 6: reloaded order ->',
      createdOrder?.id,
      'details:',
      createdOrder?.details?.length ?? 0,
    );
  });

  return createdOrder;
}



  async getOrdersByUser(userId: number) {
    return this.orderRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      relations: ['details', 'details.product'],
    });
  }

  async getOrderById(id: number) {
    return this.orderRepo.findOne({
      where: { id },
      relations: ['details', 'details.product', 'user'],
    });
  }

  async assertOrderOwnership(orderId: number, requesterId: number) {
    const order = await this.getOrderById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.user?.id !== requesterId) {
      throw new ForbiddenException('You do not have access to this order');
    }
    return order;
  }
}
