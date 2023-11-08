const router = require("express").Router();
const MongoStore = require("connect-mongo");
const session = require("express-session");
const Joi = require("joi");
const bcrypt = require("bcrypt");
require("dotenv").config();
// mySQL
const db_users = include('database/users');
const db_profile = include('database/profile');
const db_search = include('database/search')

const saltRounds = 12;
const expireTime = 60 * 60 * 1000; // session expire time, persist for 1 hour.


const cloudinary = require("cloudinary");
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_CLOUD_KEY,
  api_secret: process.env.CLOUDINARY_CLOUD_SECRET,
});


const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;


const passwordSchema = Joi.object({
  password: Joi.string().pattern(/(?=.*[a-z])/).pattern(/(?=.*[A-Z])/).pattern(/(?=.*[!@#$%^&*])/).pattern(/(?=.*[0-9])/).min(12).max(50).required()
});
const mongoSanitize = require("express-mongo-sanitize");


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
  const isLoggedIn = isValidSession(req)
  res.render("index", { isLoggedIn: isLoggedIn})
  return;

})

router.get('/searchPost', async (req, res) => { 
  const isLoggedIn = isValidSession(req)
  let wordToSearch = req.query.searchWord
  const postSearchResult = await db_search.searchPost({word: wordToSearch})
  // console.log(postSearchResult)
  if (wordToSearch === '') {
    res.render('index', {isLoggedIn: isLoggedIn, listOfPosts: [{title:"", text:"Literally nothing OuO!"}]});
    return; 
  }
  res.render("index", {isLoggedIn: isLoggedIn, listOfPosts: postSearchResult})
  return;
})


// Sign up and Login

router.get("/login", async (req, res) => {
  const isLoggedIn = isValidSession(req)
  res.render("login", { isLoggedIn: isLoggedIn, message: null });
  return;

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
  return;

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

  const validationResult = passwordSchema.validate({ password: password });
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

    res.render("error", { message: errorMsg, isLoggedIn: false });
    return;
  }

  const isValidPassword = bcrypt.compareSync(password, user.hashed_password);
  if (isValidPassword) {
    req.session.userID = user.user_id;
    req.session.name = user.name
    console.log(user.user_id, "+in loggedin");
    req.session.authenticated = true;
    req.session.email = email;
    req.session.cookie.maxAge = expireTime;
    res.render("index", { isLoggedIn: true })
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
    let errorMsg = validationResult.error.details[0].message;

    if (errorMsg.includes("(?=.*[a-z])")) {
      errorMsg = "Password must have at least 1 lowercase.";
    } else if (errorMsg.includes("(?=.*[A-Z])")) {
      errorMsg = "Password must have at least 1 uppercase.";
    } else if (errorMsg.includes("(?=[!@#$%^&*])")) {
      errorMsg = "Password requires 1 special character.";
    } else if (errorMsg.includes("(?=.*[0-9])")) {
      errorMsg = "Password needs to have 1 number.";
    }
    res.render("signup", { message: errorMsg, isLoggedIn: false });
    return;
  } else {
    var success = await db_users.createUser({ email: email, hashedPassword: hashedPassword, name: name });

    if (success) {
      res.render("index", { isLoggedIn: true })
    } else {
      res.render('error', { message: `Failed to create the user ${email}, ${name}`, title: "User creation failed" });
    }
  }
});

router.get('/profile', sessionValidation, async (req, res) => {
  isLoggedIn = isValidSession(req)
  let name = req.session.name
  let user_id = req.session.userID;
  const resultOfOwnText = await db_profile.getOwnRootText({ user_id: user_id });
  console.log(resultOfOwnText)
  res.render('profile', { listOfOwnText: resultOfOwnText, message: "Profile", isLoggedIn: isLoggedIn, name: name})
  return;
})

// BEAUTIFUL PICTURES OF CHANGWHI~ */

router.get("/showProfile", sessionValidation, async (req, res) => {
  try {
    let user_id = req.session.userID;
    let name = req.session.name;
    //req.query.id;
    console.log("userId: " + user_id);

    // Joi validate
    const schema = Joi.object({
      user_id: Joi.number().integer().min(1).required(),
    });

    const validationResult = schema.validate({ user_id });
    if (validationResult.error != null) {
      console.log(validationResult.error);

      res.render("error", { message: "Invalid user_id" });
      return;
    }
    const resultOfOwnText = await db_profile.getOwnRootText({ user_id: user_id });
    console.log("Retrieving column and ", req.session.userID)
    let responseData = await db_profile.getColumn({ user_id: user_id })
    let threadResponse = await db_profile.getThreads()
    console.log(threadResponse)
    console.log("in show pices", responseData[0])
    if (!responseData) {
      res.render('error', { message: `Failed to retrieve columns, ` })
    }
    res.render('profile', {allPics: responseData[0], listOfOwnText: resultOfOwnText, user_id: user_id, name: name, allThreads: threadResponse});

  } catch (ex) {
    res.render("error", { message: "Error connecting to MongoDB" });
    console.log("Error connecting to MongoDB");
    console.log(ex);
  }
});

router.post("/addpic", async (req, res) => {
  try {
    console.log("addpic form submit");

    let user_id = req.session.userID;

    const schema = Joi.object({
      user_id: Joi.number().integer().min(1).required(),
      name: Joi.string().alphanum().min(2).max(50).required(),
    });
    const validationResult = schema.validate({
      user_id,
      name: req.body.pic_name,
    });
    if (validationResult.error != null) {
      console.log(validationResult.error);
      res.render("error", { message: "Invalid first_name, last_name, email" });
      return;
    }

    console.log("addColumn and ", req.session.userID)
    let responseData = await db_profile.addColumn({ name: req.body.pic_name, user_id: user_id})
    if (!responseData) {
      res.render('error', { message: `Failed to create the image contents for:  ${req.body.pic_name}, `, title: "Adding Picture column failed" })
    }
    res.redirect(`/showProfile?id=${user_id}`);
  } catch (ex) {
    res.render("error", { message: "Error connecting to MySQL" });
    console.log("Error connecting to MySQL");
    console.log(ex);
  }
});

router.post("/setUserPic", sessionValidation, upload.single("image"), function(req, res, next) {
  let picture_UUID = req.body.pic_id;
  let user_id = req.session.userID;
  let buf64 = req.file.buffer.toString("base64");
  stream = cloudinary.uploader.upload(
    "data:image/octet-stream;base64," + buf64,
    async function(result) {
      try {
        console.log("userId: " + user_id);
        console.log("pcitureUUID: " + picture_UUID);
        const schema = Joi.object({
          user_id: Joi.number().integer().min(1).required(),
        });

        const validationResult = schema.validate({ user_id });
        if (validationResult.error != null) {
          console.log(validationResult.error);

          res.render("error", { message: "Invalid pet_id or user_id" });
          return;
        }

        console.log("cloudinary link", result.url)
        console.log("cloudinary link", result.public_id)
        console.log("cloudinary link", req.session.userID)
        let responseData = await db_profile.insertImage({ link: result.url, public_id: result.public_id, picture_UUID: picture_UUID })
        if (!responseData) {
          res.render('error', { message: `Failed to create the image contents for` })
        }
        res.redirect(`/showProfile?id=${user_id}`);
        // }
      } catch (ex) {
        res.render("error", { message: "Error connecting to MongoDB" });
        console.log("Error connecting to MongoDB");
        console.log(ex);
      }
    },
  );
  console.log(req.body);
  console.log(req.file);
});

router.get('/deleteProfilePic', sessionValidation, async (req, res) => {
  try {
    console.log("delete image");
    let user_id = req.session.userID;
    let picture_UUID = req.query.picture_UUID;
    const schema = Joi.object(
      {
        user_id: Joi.number().integer().min(1).required(),
      });
    const validationResult = schema.validate({ user_id });
    if (validationResult.error != null) {
      console.log(validationResult.error);
      res.render('error', { message: 'Invalid user_id ' });
      return;
    }
    let responseData = await db_profile.deleteImage({ picture_UUID: picture_UUID })
    if (!responseData) {
      res.render('error', { message: `Failed to delete the image` })
    }

    res.redirect(`/showProfile`);
  }
  catch (ex) {
    res.render('error', { message: 'Error connecting to MySQL' });
    console.log("Error connecting to MySQL");
    console.log(ex);
  }
});


router.get('/createPost', async (req, res) => {
  const isLoggedIn = isValidSession(req)
  res.render('postForm', {isLoggedIn: isLoggedIn})
})


router.post('/submitPost', async (req, res) => {
  const isLoggedIn = isValidSession(req)
  let textTitle = req.body.text_title;
  let user_id = req.session.userID;
  let textContent = req.body.text_content;
  let name = req.session.name;
  const textExists = await db_profile.doesTextExist({ user_id: user_id, title: textTitle });
  if (!textExists) {
    const textSuccess = await db_profile.createTextPost({ user_id: user_id, title: textTitle, content: textContent});
    if (textSuccess) {
      const textInfoID = await db_profile.getTextInfoID({ user_id: user_id });
      await db_profile.createRootLinkClosure({ text_info_id: textInfoID });
      // get list of user's own text post
      const resultOfOwnText = await db_profile.getOwnRootText({ user_id: user_id });
      if (resultOfOwnText) {
        res.render('profile', { listOfOwnText: resultOfOwnText, isLoggedIn: isLoggedIn, name: name});
        return;
      } else {
        res.render('error', { message: 'Unable to get thread!', title: 'Thread creation failed!' });
        return;
      }
    } else {
      res.render('error', { message: `Failed to create the thread contents for: ${textTitle}`, title: 'Thread creation failed' });
      return;
    }
  } else {
    res.render('error', { message: 'Thread with the same title already exists!', title: 'Thread creation failed' });
    return;
  }
});






module.exports = router;

