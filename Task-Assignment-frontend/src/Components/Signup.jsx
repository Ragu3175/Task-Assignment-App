import { use, useState } from 'react'
import './Signup.css'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom';
function Signup() {
    const [username,setUsername] = useState("");
    const [email,setEmail] = useState("");
    const [password,setPassword] = useState("");

    const navigate = useNavigate()
    const handleSignup = async() => {
        try{
            const res = await axios.post('http://localhost:5000/api/signup',{
                username,
                email,
                password
        })
        if(res.status===201){
            alert("Signup is succesfull")
             navigate('/login')
        }
        }catch(err){
            if(err.response?.status===409){
                alert("the email is already exist")
            }else{
                console.error("something went wrong while signup in frontend")
            }
            
        }
    }

  return (
    <div className='signup-main'>
        <div className="form-card">
            <h1>Signup</h1>
            <input type="text" placeholder='Enter username' value={username} onChange={(e) => setUsername(e.target.value)}/>
            <input type="email" placeholder='Enter your email' value={email} onChange={(e) => setEmail(e.target.value)}/>
            <input type="password" placeholder='Enter the password'value={password} onChange={(e) => setPassword(e.target.value)}/>
            <button onClick={handleSignup}>Submit</button>
            <Link to={'/login'}>already have an account</Link>
        </div>
    </div>
  )
}
export default Signup