import { useState } from "react"
import axios from 'axios'
import { useNavigate } from "react-router-dom";
import './Login.css'
function Login() {
    const [email,setEmail] = useState("");
    const [password,setPassword] = useState("");

     const API_URL = import.meta.env.VITE_API_URL;

    const navigate = useNavigate();
    const handleLogin = async() => {
        try{
            const res = await axios.post(`${API_URL}/api/signup/login`,{
                email,
                password
            })
            if(res.status===201){
                const {accessToken} = res.data;
                localStorage.setItem('token',accessToken)
                setTimeout(() => {
                    navigate('/main')
                },200);
                alert("login successfull");
            }
        }catch(err){
            if(err.response?.status===404){
                alert("email is not exist")
            }else{
                console.error("something went wrong in frontend while login")
            }
        }
    }
  return (
    <div className="login-main">
        <div className="form-card">
            <h1>Login</h1>
            <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)}/>
            <input type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)}/>
            <button onClick={handleLogin}>Submit</button>
        </div>
    </div>
  )
}
export default Login