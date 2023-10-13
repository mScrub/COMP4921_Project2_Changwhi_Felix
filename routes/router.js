const router = require("express").Router();
//require("dotenv").config();


router.get("/", (req, res) => {
  console.log("idex page hit")
  res.render("index", { isLoggedIn: false })
})

module.exports = router;

