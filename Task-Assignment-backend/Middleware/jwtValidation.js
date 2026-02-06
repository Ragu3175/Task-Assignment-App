const jwt = require('jsonwebtoken');

const validAuthentication = async(req,res,next) => {
    try{
        const authHeader = req.headers.authorization;
        if(!authHeader || !authHeader.startsWith('Bearer ')){
            return res.status(403).json({message:"token is invalid"})
        }
        const token = authHeader.split(" ")[1];
        jwt.verify(token,process.env.ACCESS_TOKEN,(err,decode) => {
            if(err){
                return res.status(403).json({message:"unauthorized access"})
            }
            req.user = decode.user;
            next()
        })

    }catch(err){
        console.error("something went wrong in middleware")
    }
}

module.exports = validAuthentication