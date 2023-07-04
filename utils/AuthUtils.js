var validator = require("validator");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const cleanUpAndValidate = ({ name, email, username, phone, password }) => {
  return new Promise((resolve, reject) => {
    if (!name || !email || !username || !phone || !password) {
      reject("Missing Credentials!!");
    }

    if (typeof email !== "string") {
      reject("Invalid Email");
    }

    if (typeof username !== "string") {
      reject("Invalid Username");
    }

    if (typeof password !== "string") {
      reject("Invalid Password");
    }

    if (username.length <= 2 || username.length > 50) {
      reject("Usernames length should be in 3-50 letters");
    }

    if (password.length <= 7 || password.length > 25) {
      reject("Password length should be in 7-25 letters");
    }

    // Validator package for email
    if (!validator.isEmail(email)) {
      reject("Invalid Email format!!");
    }
    if (!validator.isLowercase(email)) {
      reject("Email should be in lowercase");
    }

    resolve();
  });
};

const cleanUpLoginIdandPassword = ({ loginId, password }) => {
  return new Promise((resolve, reject) => {
    if (!loginId || !password) {
      reject("Missing Credentials!!");
    }

    if (typeof loginId !== "string") {
      reject("Invalid Login-ID!");
    }

    if (typeof password !== "string") {
      reject("Invalid Password!");
    }

    resolve();
  });
};

//SECRET KEY VARIABLE
const SECRET_KEY = "This is Library Management task";
const generateJWTToken = (email) => {
  const JWT_TOKEN = jwt.sign(email, SECRET_KEY);

  return JWT_TOKEN;
};

const sendVerificationToken = ({ email, verificationToken }) => {
  const trasporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    service: "gmail",
    auth: {
      user: "kshirsagars234@gmail.com",
      pass: "scnzizudarazopna",
    },
  });

  var mailOptions = {
    from: "Library Management app pvt. ltd.",
    to: email,
    subject: "Email verification for Library management!!",
    html: `
          <p>Please click the following link to verify your email:</p>
          <a href="http://localhost:8000/api/${verificationToken}">Verify Email</a>
        `,
  };

  trasporter.sendMail(mailOptions, (error, info) => {
    if (error) throw error;

    console.log("Mail Send Successfully");
  });
};

module.exports = {
  cleanUpAndValidate,
  cleanUpLoginIdandPassword,
  generateJWTToken,
  sendVerificationToken,
};
