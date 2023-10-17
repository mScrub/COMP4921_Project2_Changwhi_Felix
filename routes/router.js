const router = require("express").Router();
const MongoStore = require("connect-mongo");
const session = require("express-session");
const Joi = require("joi");
const bcrypt = require("bcrypt");
require("dotenv").config();
// mySQL
const db_users = include('database/users');

const passwordSchema = Joi.object({
  password: Joi.string().pattern(/(?=.*[a-z])/).pattern(/(?=.*[A-Z])/).pattern(/(?=.*[!@#$%^&*])/).pattern(/(?=.*[0-9])/).min(12).max(50).required()
});

const saltRounds = 12;
const expireTime = 60 * 60 * 1000; // session expire time, persist for 1 hour.

const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;

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


router.get("/", (req, res) => {
  console.log("idex page hit")
  res.render("index", { isLoggedIn: false })
})



// Sign up and Login

router.get("/login", async (req, res) => {
  const isLoggedIn = isValidSession(req)
  res.render("login", { isLoggedIn: isLoggedIn, message: null });

});

router.get('/logout', (req, res) => {
  console.log("Logging out");
  
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Failed to log out');
    }
    
    res.redirect('/login');
  });
});

router.get("/signup", async (req, res) => {
  console.log("checking" + req.query.invalid)
  var invalid = req.query.invalid === undefined ? true : req.query.invalid;
  res.render("signup", { invalid: invalid, isLoggedIn: false });

});


router.post("/loggingin", async (req, res) => {
  var email = req.body.email;
  var password = req.body.password;
  var users = await db_users.getUsers();
  let user;
  
  for (let i = 0; i < users.length; i++) {
    if (users[i].email == email) {
      user = users[i];
      break;
    }
  }

  if (user === undefined) {
    res.render('login', { message: "Why did you enter the wrong email?!", isLoggedIn: false });
    return;
  } 

  const validationResult = passwordSchema.validate({password: password});
  if (validationResult.error) {
    let errorMsg = validationResult.error.details[0].message;
    if (errorMsg.includes("(?=.*[a-z])")) {
      errorMsg = "Password must have at least 1 lowercase.";
    } else if (errorMsg.includes("(?=.*[A-Z])")) {
      errorMsg = "Password must have at least 1 uppercase.";
    } else if (errorMsg.includes("(?=.*[!@#$%^&*])")) {
      errorMsg = "Password requires 1 special character.";
    } else if (errorMsg.includes("(?=.*[0-9])")) {
      errorMsg = "Password needs to have 1 number.";
    } else {
      errorMsg = null;
    }

    res.render("login", { message: errorMsg, isLoggedIn: false });
    return;
  }

  const isValidPassword = bcrypt.compareSync(password, user.hashed_password);
  if (isValidPassword) {
    req.session.userID = user.user_id;
    console.log(user.user_id, "+in loggedin");
    req.session.authenticated = true;
    req.session.email = email;
    req.session.cookie.maxAge = expireTime;
    res.render('index', { isLoggedIn: true });
  } else {
    req.session.authenticated = false;
    res.redirect('/login');
  }
});


// User creation
router.post("/submitUser", async (req, res) => {
  var email = req.body.email;
  var password = req.body.password;
  var name = req.body.name;
  var hashedPassword = bcrypt.hashSync(password, saltRounds);
  
  const validationResult = passwordSchema.validate({ password });

  if (validationResult.error) {
    let errorMsgPW = validationResult.error.details[0].message;
    
    if (errorMsgPW.includes("(?=.*[a-z])")) {
      errorMsgPW = "Password must have at least 1 lowercase.";
    } else if (errorMsgPW.includes("(?=.*[A-Z])")) {
      errorMsgPW = "Password must have at least 1 uppercase.";
    } else if (errorMsgPW.includes("(?=[!@#$%^&*])")) {
      errorMsgPW = "Password requires 1 special character.";
    } else if (errorMsgPW.includes("(?=.*[0-9])")) {
      errorMsgPW = "Password needs to have 1 number.";
    }
    res.render("signup", { message: errorMsgPW, isLoggedIn: false });
    return;
  } else {
    var success = await db_users.createUser({ email: email, hashedPassword: hashedPassword, name: name });

    if (success) {
      res.redirect('/login');
      return;
    } else {
      res.render('error', { message: `Failed to create the user ${email}, ${name}`, title: "User creation failed" });
    }
  }
});

router.get('/profile', (req, res) => {
  res.render('profile', {message: "Profile", isLoggedIn: false})
})


function isValidSession(req) {
  console.log("isValidSession")
  if (req.session.authenticated) {
    return true;
  }
  return false;
}

module.exports = router;

