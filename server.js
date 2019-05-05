"use strict";

const path = require('path');
const fs = require('fs');

const Koa = require('koa');
const Router = require('koa-router');
const serve = require('koa-static');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');

const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');

mongoose
  .connect('mongodb://wasya1212:wasya1212cool@ds149706.mlab.com:49706/remote', { useNewUrlParser: true })
  .then(() => console.log("MongoDb connected..."))
  .catch(err => console.error(err));

const User = mongoose.model('User', {
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    validate: {
      validator: validator.isEmail,
      message: '{VALUE} is not a valid email',
      isAsync: false
    }
  },
  password: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return v.length >= 6;
      },
      message: '{VALUE} need length > 5 symbols!'
    },
  }
});

const createUser = newUser => {
  return new Promise((resolve, reject) => {
    if (newUser.password.length < 6) {
      reject(new Error("Password must be 6 or more characters!"));
    }

    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(newUser.password, salt, function(err, hash) {
        newUser.password = hash;
        resolve(newUser.save());
      });
    });
  });
}

const app = new Koa();
const router = new Router();

const PORT = process.env.PORT || 5000;

router.get('/', async (ctx, next) => {
  ctx.type = 'html';
  ctx.body = fs.createReadStream(path.resolve(__dirname, 'public/index.html'));
  await next();
});

router.post('/login', async (ctx, next) => {
  const user = await User.findOne({ email: ctx.request.body.email }, (err, user) => user);

  if (!user) {
    ctx.throw(404, "User not found");
  }

  const isMatch = bcrypt.compareSync(ctx.request.body.password, user.password);

  if (isMatch) {
    ctx.body = user;
  } else {
    ctx.throw(403, "Wrong password!");
  }

  await next();
  // await User.findOne({ email: ctx.request.body.email }, (err, user) => {
  //   if (!user) {
  //     return;
  //   }
  //
  //   bcrypt.compare(ctx.request.body.password, user.password, function(err, isMatch) {
  //     if (isMatch) {
  //       ctx.body = user;
  //     } else {
  //       ctx.body = { };
  //     }
  //
  //     next();
  //   });
  // });
});

router.post('/sign-in', async (ctx, next) => {
  const user = new User({
    email: ctx.request.body.email,
    password: ctx.request.body.password
  });

  await createUser(user)
    .then(newUser => {
      console.log(newUser);
      ctx.body = { user: newUser };
    });

  await next();
});

router.post('/pass', async (ctx, next) => {
  ctx.body = { cost: data };

  await next();
});

app.use(async (ctx, next) => {
  const start = new Date();
  await next();
  const ms = new Date() - start;
  ctx.set('X-Response-Time', `${ms}ms`);
});

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.statusCode || err.status || 500;
    ctx.body = {code: err.statusCode, message: err.message};
    ctx.app.emit('error', err, ctx);
  }
})

app.on('error', (err, ctx) => {
  console.error(err);
});

app.use(cors());
app.use(serve(path.resolve(__dirname, 'public')));
app.use(bodyParser());
app.use(router.routes());

app.listen(PORT, () => {
  console.log(`Server work on port ${PORT}...`);
});
