const router = require("express").Router();
//require("dotenv").config();


router.get("/", (req, res) => {
  console.log("idex page hit")
  res.render("index")
})

module.exports = router;

