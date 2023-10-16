const router = require("express").Router();
require("dotenv").config();

const MongoStore = require("connect-mongo");

const session = require("express-session");
const expireTime = 24 * 60 * 60 * 1000; // session expire time, persist for 1 hour.

const bcrypt = require("bcrypt");
const saltRounds = 12;

const mongoSanitize = require("express-mongo-sanitize");

router.use(mongoSanitize({ replaceWith: "%" }));

const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;


const Joi = require("joi");
const passwordSchema = Joi.object({
  password: Joi.string().pattern(/(?=.*[a-z])/).pattern(/(?=.*[A-Z])/).pattern(/(?=.*[!@#$%^&*])/).pattern(/(?=.*[0-9])/).min(12).max(50).required()
});

var mongoStore = MongoStore.create({
  mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@cluster1.5f9ckjd.mongodb.net/COMP4921_Project1_DB?retryWrites=true&w=majority`,
  crypto: {
    secret: mongodb_session_secret,
  },
});

router.use(
  session({
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false,
    resave: true,
  })
);

function isValidSession(req) {
  console.log("isValidSession")
  if (req.session.authenticated) {
    return true;
  }
  return false;
}

function sessionValidation(req, res, next) {
  console.log("hit sessionValidation")
  if (!isValidSession(req)) {
    res.locals.isLoggedIn = req.session.authenticated === true;
    req.session.destroy();
    res.redirect('/login');
    return;
  }
  else {
    res.locals.isLoggedIn = req.session.authenticated === true;
    next();
  }
}

router.get("/", (req, res) => {
  console.log("idex page hit")
  res.render("index", { isLoggedIn: false })
})


router.get("/login", async (req, res) => {
  const isLoggedIn = isValidSession(req)
  res.render("login", { isLoggedIn: isLoggedIn, message: null });

});


router.get('/logout', (req, res) => {
  console.log("Logging out")
  req.session.destroy();
  res.redirect('/login')
  return;
})


router.post("/loggingin", async (req, res) => {
  var email = req.body.email;
  var password = req.body.password;
  var users = await db_users.getUsers();
  let user;
  for (i = 0; i < users.length; i++) {
    if (users[i].email == email) {
      user = users[i];
    }
  }
  if (user === undefined) {
    res.render('login', { message: "Why did you enter the wrong email?!", isLoggedIn: false })
  } else {
    const validationResult = passwordSchema.validate({ password });
    if (validationResult) {
      for (i = 0; i < users.length; i++) {
        const isValidPassword = bcrypt.compareSync(password, user.hashed_password)
        if (user.email == email) {
          if (isValidPassword) {
            req.session.userID = user.user_id
            console.log(user.user_id, "+in loggedin")
            req.session.authenticated = true;
            req.session.email = email;
            req.session.cookie.maxAge = expireTime;
            res.render('index', { isLoggedIn: isValidSession });
            return
          }
          else if (!isValidPassword) {
            req.session.authenticated = false;
            res.redirect('/login');
            return;
          }
        }
      }
      //User & PW combo not found.
      res.render("login", { message: null, isLoggedIn: false });
    } else {
      let errorMsg = validationResult.error.details[0].message
      if (errorMsg.includes("(?=.*[a-z])")) {
        errorMsg = "Password must have at least 1 lowercase."
      } else if (errorMsg.includes("(?=.*[A-Z])")) {
        errorMsg = "Password must have at least 1 uppercase."
      } else if (errorMsg.includes("(?=[!@#$%^&*])")) {
        errorMsg = "Password requires 1 special character."
      } else if (errorMsg.includes("(?=.*[0-9])")) {
        errorMsg = "Password needs to have 1 number."
      } else {
        errorMsg = null;
      }
      if (validationResult.error != null) {
        res.render("login", { message: errorMsg, isLoggedIn: false });
        return;
      }
    }
  }
});


module.exports = router;

