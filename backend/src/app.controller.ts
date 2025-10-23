import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('products')
  getProducts() {
    return [
      { id: 1, name: 'T-Shirt', price: 100 },
      { id: 2, name: 'Shoes', price: 200 },
    ];
  }
}
