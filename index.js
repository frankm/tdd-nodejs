const app = require('./src/app');
const sequelize = require('./src/config/db');

sequelize.sync({ force: true });

app.listen(3000, () => console.log('app is running'));
