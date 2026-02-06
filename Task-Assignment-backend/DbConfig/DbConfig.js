const mongoose = require('mongoose');

const Dbconnect = async() => {
    try{
        const connect = await mongoose.connect(process.env.CONNECTION_STRING)
        console.log("Database is connected",process.env.CONNECTION_STRING,connect.connection.host,connect.connection.name)
    }catch(err){
        console.error("something went wront while connecting mongoDb",err)
        process.exit(1);
    }
}

module.exports = {Dbconnect}