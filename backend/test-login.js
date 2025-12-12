const bcrypt = require('bcrypt');

const password = '123456';
const hash = '$2b$10$1VuosKwUaLdldgUIqNR8TeHKHUSGQN2Axle5wbbfvXsBqHClIVuCK';

bcrypt.compare(password, hash).then(result => {
  console.log('Password "123456" matches hash:', result);
});

