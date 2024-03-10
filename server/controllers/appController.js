import UserModel from "../model/User.model.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import ENV from "../config.js";
import otpGenerator from 'otp-generator'

/** middleware for verify user */
export async function verifyUser(req, res, next){
    try {
        
        const { username } = req.method == "GET" ? req.query : req.body;

        // check the user existance
        let exist = await UserModel.findOne({ username });
        if(!exist) return res.status(404).send({ error : "Can't find User!"});
        next();

    } catch (error) {
        return res.status(404).send({ error: "Authentication Error"});
    }
}

/** POST: http://localhost:8080/api/register 
 * @param : {
  "username" : "example123",
  "password" : "admin123",
  "email": "example@gmail.com",
  "firstName" : "bill",
  "lastName": "william",
  "mobile": 8009860560,
  "address" : "Apt. 556, Kulas Light, Gwenborough",
  "profile": ""
}
*/
export async function register(req, res) {
    try {
        const { username, password, profile, email } = req.body;

        // check the existing user
        const existUsername = UserModel.findOne({ username }).exec();
        const existEmail = UserModel.findOne({ email }).exec();

        Promise.all([existUsername, existEmail])
            .then(([usernameUser, emailUser]) => {
                if (usernameUser) {
                    throw { error: "Please use a unique username" };
                }
                if (emailUser) {
                    throw { error: "Please use a unique email" };
                }

                if (password) {
                    bcrypt.hash(password, 10)
                        .then(hashedPassword => {

                            const user = new UserModel({
                                username,
                                password: hashedPassword,
                                profile: profile || '',
                                email
                            });

                            // return save result as a response
                            user.save()
                                .then(result => res.status(201).send({ msg: "User registered successfully" }))
                                .catch(error => res.status(500).send({ error }));

                        }).catch(error => {
                            console.error("Error hashing password:", error);
                            return res.status(500).send({
                                error: "Unable to hash password"
                            });
                        });
                }
            }).catch(error => {
                console.error("Error during registration:", error);
                return res.status(500).send({ error });
            });

    } catch (error) {
        console.error("Error in try-catch block:", error);
        return res.status(500).send(error.message || "Internal Server Error");
    }
}


/** POST: http://localhost:8080/api/login 
 * @param: {
  "username" : "example123",
  "password" : "admin123"
}
*/
export async function login(req,res){
   
    const { username, password } = req.body;

    try {
        
        UserModel.findOne({ username })
            .then(user => {
                bcrypt.compare(password, user.password)
                    .then(passwordCheck => {

                        if(!passwordCheck) return res.status(400).send({ error: "Don't have Password"});

                        // create jwt token
                        const token = jwt.sign({
                                        userId: user._id,
                                        username : user.username
                                    }, ENV.JWT_SECRET , { expiresIn : "24h"});

                        return res.status(200).send({
                            msg: "Login Successful...!",
                            username: user.username,
                            token
                        });                                    

                    })
                    .catch(error =>{
                        return res.status(400).send({ error: "Password does not Match"})
                    })
            })
            .catch( error => {
                return res.status(404).send({ error : "Username not Found"});
            })

    } catch (error) {
        return res.status(500).send({ error});
    }
}

/** GET: http://localhost:8080/api/user/example123 */
export async function getUser(req, res) {
    const { username } = req.params;

    try {
        if (!username) {
            return res.status(400).send({ error: "Invalid Username" });
        }

        const user = await UserModel.findOne({ username }).exec();

        if (!user) {
            return res.status(404).send({ error: "User not found" });
        }

        // Remove sensitive data (password) before sending the user object
        const { password, ...userData } = user.toObject();

        return res.status(200).send(userData);
    } catch (error) {
        console.error("Error fetching user:", error);
        return res.status(500).send({ error: "Internal Server Error" });
    }
}


/** PUT: http://localhost:8080/api/updateuser 
 * @param: {
  "header" : "<token>"
}
body: {
    firstName: '',
    address : '',
    profile : ''
}
*/
export async function updateUser(req, res) {
    try {
        // const userId = req.query.id;
        const { userId } = req.user;

        if (!userId) {
            return res.status(401).send({ error: "User Not Found...!" });
        }

        const body = req.body;

        // Update the user data
        const result = await UserModel.updateOne({ _id: userId }, body).exec();

        if (!result) {
            return res.status(500).send({ error: "Error updating user data" });
        }

        return res.status(201).send({ msg: "Record Updated...!" });
    } catch (error) {
        console.error("Error updating user:", error);
        return res.status(500).send({ error: "Internal Server Error" });
    }
}



/** GET: http://localhost:8080/api/generateOTP */
export async function generateOTP(req,res){
    req.app.locals.OTP = await otpGenerator.generate(6, { lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false})
    res.status(201).send({ code: req.app.locals.OTP })
}

/** GET: http://localhost:8080/api/verifyOTP */
export async function verifyOTP(req,res){
    const { code } = req.query;
    if(parseInt(req.app.locals.OTP) === parseInt(code)){
        req.app.locals.OTP = null; // reset the OTP value
        req.app.locals.resetSession = true; // start session for reset password
        return res.status(201).send({ msg: 'Verify Successsfully!'})
    }
    return res.status(400).send({ error: "Invalid OTP"});
}



// successfully redirect user when OTP is valid
/** GET: http://localhost:8080/api/createResetSession */
export async function createResetSession(req,res){
    if(req.app.locals.resetSession){
        return res.status(201).send({ flag : req.app.locals.resetSession})
    }
   return res.status(440).send({error : "Session expired!"})
}


// update the password when we have valid session
/** PUT: http://localhost:8080/api/resetPassword */
export async function resetPassword(req, res) {
    try {
        if(!req.app.locals.resetSession) return res.status(440).send({error : "Session expired!"});

        const { username, password } = req.body;

        try {
            const user = await UserModel.findOne({ username }).exec();
            if (!user) {
                return res.status(404).send({ error: "Username not Found" });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            await UserModel.updateOne({ username: user.username }, { password: hashedPassword });

            req.app.locals.resetSession = false; // reset session
            return res.status(201).send({ msg: "Record Updated...!" });
        } catch (error) {
            return res.status(500).send({ error: "Unable to reset password" });
        }
    } catch (error) {
        return res.status(401).send({ error });
    }
}

