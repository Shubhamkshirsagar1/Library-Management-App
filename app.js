const express = require("express");
const bcrypt = require("bcrypt");
var validator = require("validator");
const session = require("express-session");
const mongoDbSession = require("connect-mongodb-session")(session);
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

//Mongo-Db Connection
const MONGO_URI = `mongodb+srv://kshirsagars234:123123123@shubham.eiovjmm.mongodb.net/Nodejs-test`;

//Variables
const app = express();
const saltRounds = 10;
var clc = require("cli-color");
const store = new mongoDbSession({
  uri: MONGO_URI,
  collection: "sessions",
});

//Imports
const { default: mongoose } = require("mongoose");
const {
  cleanUpAndValidate,
  cleanUpLoginIdandPassword,
  sendVerificationToken,
  generateJWTToken,
} = require("./utils/AuthUtils");
const userSchema = require("./userSchema");
const { isAuth } = require("./middlewares/AuthMiddleware");
const BookModel = require("./models/BookModel");

//MIddleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(
  session({
    secret: "kshirsagar234",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

// Set the port number
const PORT = process.env.PORT || 8000;

//Connect to MongoDb
mongoose
  .connect(MONGO_URI)
  .then((res) => {
    console.log("MongoDb Connected!!");
  })
  .catch((err) => {
    console.log(err);
  });

// Set EJS as the view engine for rendering dynamic web pages
app.set("view engine", "ejs");

//Routes
app.get("/", (req, res) => {
  res.send("This is the Home Route");
});

// Registration route (GET)
app.get("/registration", (req, res) => {
  return res.render("registration");
});

// Registration route (POST)
app.post("/registration", async (req, res) => {
  const { name, email, username, phone, password } = req.body;
  console.log(name, email, username, phone, password);
  try {
    // 1) data validation
    await cleanUpAndValidate({ name, email, username, phone, password });
    // 2) will check if user already exists in db or not if not the go to next step

    // Check if user already exists with the same email
    const userExistsEmail = await userSchema.findOne({ email: email });
    if (userExistsEmail) {
      return res.send({
        status: 400,
        message: "Email Already exits!",
      });
    }

    // Check if user already exists with the same Username
    const userExistsUsername = await userSchema.findOne({ username: username });
    if (userExistsUsername) {
      return res.send({
        status: 400,
        message: "Username Already exits!",
      });
    }

    // 3) with the help of MVC structure schema and all we will save our user to db with save() functionality.

    // Hash the password using bcrypt
    const hashPassword = await bcrypt.hash(password, saltRounds);

    const user = userSchema({
      name: name,
      email: email,
      username: username,
      phone: phone,
      password: hashPassword,
    });

    try {
      const userDb = await user.save();
      console.log(userDb);

      //Token Generate
      const verificationToken = generateJWTToken(email);
      console.log(verificationToken);

      //Send mail function
      sendVerificationToken({ email, verificationToken });
      console.log(userDb);

      return res.send({
        status: 200,
        message:
          "Registration successfull, Link has been sent to your mail id. Please verify before login.",
      });
    } catch (error) {
      return res.send({
        status: 500,
        message: "Database Error!!",
        error: error,
      });
    }
  } catch (error) {
    return res.send({
      status: 400,
      message: "Invalid Data!!",
      error: error,
    });
  }
});

// Token route (GET)
app.get("/api/:token", (req, res) => {
  console.log(req.params);
  const token = req.params.token;
  const SECRET_KEY = "This is Library Management task";

  jwt.verify(token, SECRET_KEY, async (err, decoded) => {
    try {
      const userDb = await userSchema.findOneAndUpdate(
        { email: decoded },
        { emailAuthenticated: true }
      );
      console.log(userDb);
      return res.status(200).redirect("/login");
    } catch (error) {
      res.send({
        status: 500,
        message: "database error",
        error: error,
      });
    }
  });
});

// Login route (GET)
app.get("/login", (req, res) => {
  return res.render("login");
});

// Login route (POST)
app.post("/login", async (req, res) => {
  const { loginId, password } = req.body;

  try {
    // 1) data validation
    await cleanUpLoginIdandPassword({ loginId, password });

    // 2) // Check if loginId is email or username.
    try {
      let userDb;
      if (validator.isEmail(loginId)) {
        userDb = await userSchema.findOne({ email: loginId });
      } else {
        userDb = await userSchema.findOne({ username: loginId });
      }

      if (!userDb) {
        return res.send({
          status: 400,
          message: "User not found. Please register first!!",
        });
      }

      if (!userDb.emailAuthenticated) {
        return res.send({
          status: 400,
          message: "Email not Authenticated!!",
        });
      }

      //Compare Password
      const comparePass = await bcrypt.compare(password, userDb.password);
      if (!comparePass) {
        return res.send({
          status: "400",
          message: "Wrong Password!!",
        });
      }

      //Now Add session cookies
      console.log(req.session);
      req.session.isAuth = true;
      req.session.user = {
        userId: userDb._id,
        email: userDb.email,
        username: userDb.username,
      };

      return res.redirect("/dashboard");
    } catch (error) {
      return res.send({
        status: 500,
        message: "Database Error!!",
        error: error,
      });
    }
  } catch (error) {
    return res.send({
      status: 400,
      message: "Invalid Data",
      error: error,
    });
  }
});

// Forgot-Password route (GET)
app.get("/forgotPasswordPage", (req, res) => {
  res.render("forgotPasswordPage");
});

// Resend-Verification route (GET)
app.get("/resendVerificationMail", (req, res) => {
  res.render("resendVerificationMail");
});

// Resend-Verification route (POST)
app.post("/resendVerificationMail", async (req, res) => {
  console.log(req.body);
  const { email } = req.body;

  // Check if user exists with the provided email
  const user = await userSchema.findOne({ email: email });
  console.log(user);
  if (!user) {
    return res.send({
      status: 400,
      message: "User not found. Please register first!",
    });
  }

  // Generate a new verification token
  const verificationToken = generateJWTToken(email);

  // Send the verification email
  sendVerificationToken({ email, verificationToken });

  return res.send({
    status: 200,
    message: "Verification link has been resent to your email.",
  });
});

// Dashboard route (GET)
app.get("/dashboard", isAuth, async (req, res) => {
  return res.render("dashboard");
});

app.post("/create-item", isAuth, async (req, res) => {
  const { bookTitle, bookAuthor, bookPrice, bookCategory } = req.body;

  // Data validation
  if (!bookTitle || typeof bookTitle !== "string" || bookTitle.length > 100) {
    return res.status(400).send({
      status: 400,
      message: "Invalid book format or length",
    });
  }

  try {
    const book = new BookModel({
      bookTitle: bookTitle,
      bookAuthor: bookAuthor,
      bookPrice: bookPrice,
      bookCategory: bookCategory,
      username: req.session.user.username,
    });
    const bookDb = await book.save();

    console.log(bookDb);
    return res.redirect("dashboard");
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: 500,
      message: "Database error",
      error: error.message,
    });
  }
});

app.post("/edit-item", isAuth, async (req, res) => {
  const { id, newBookTitle, newBookAuthor, newBookPrice, newBookCategory } =
    req.body;

  // Data validation
  if (
    !id ||
    !newBookTitle ||
    typeof newBookTitle !== "string" ||
    newBookTitle.length > 100
  ) {
    return res.status(400).send({
      status: 400,
      message: "Invalid book format or length",
    });
  }

  try {
    const bookDb = await BookModel.findOneAndUpdate(
      { _id: id },
      {
        bookTitle: newBookTitle,
        bookAuthor: newBookAuthor,
        bookPrice: newBookPrice,
        bookCategory: newBookCategory,
      }
    );

    return res.send({
      status: 200,
      message: "Book updated successfully",
      data: bookDb,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: 500,
      message: "Database error",
      error: error.message,
    });
  }
});

app.post("/delete-item", isAuth, async (req, res) => {
  const id = req.body.id;

  // Data validation
  if (!id) {
    return res.status(400).send({
      status: 400,
      message: "Missing credentials",
    });
  }

  try {
    const bookDb = await BookModel.findOneAndDelete({ _id: id });

    return res.send({
      status: 200,
      message: "Book deleted successfully",
      data: bookDb,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: 500,
      message: "Database error",
      error: error.message,
    });
  }
});

// logout api's
app.post("/logout", isAuth, (req, res) => {
  console.log(req.session);
  req.session.destroy((err) => {
    if (err) throw err;

    return res.redirect("/login");
  });
});

// Pagination api (GET)
app.get("/pagination_dashboard", isAuth, async (req, res) => {
  const skip = req.query.skip || 0; //client
  const LIMIT = 5; //backend

  const user_name = req.session.user.username;

  try {
    const books = await BookModel.aggregate([
      // match, pagination-skip-limit
      { $match: { username: user_name } },
      {
        $facet: {
          data: [{ $skip: parseInt(skip) }, { $limit: LIMIT }],
        },
      },
    ]);
    // console.log(books[0].data);
    return res.send({
      status: 200,
      message: "Read success",
      data: books[0].data,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
});

app.listen(8000, () => {
  console.log(clc.yellow.underline(`Server is running on port ${PORT}`));
});
