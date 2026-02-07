import axios from "axios";
import { useEffect, useState } from "react"

function CreateGroup({groupInbox,setGroupInbox}) {
    const [groupname,setGroupname] = useState("");

     const API_URL = import.meta.env.VITE_API_URL;
   
    const handleGroups = async() => {
        try{
            const token = localStorage.getItem('token');
            if(!token) throw(new Error({message:"token is not provided in handleGroups "}));
            const res = await axios.post(`${API_URL}/api/groups`,{
                groupname
            },{
                headers:{
                    Authorization:`Bearer ${token}`
                }
            })
            if(res.status===201){
                const groupres = await axios.get(`${API_URL}/api/groups`,
                    {
                        headers:{Authorization:`Bearer ${token}`}
                    })
                setGroupInbox(groupres.data.groups ?? []);
                setGroupname("")
                // alert('group created succesfully')
            }
        }catch(err){
            console.error("something went wront in frontend in inbox function",err.message)
        }
    }
  return (
    <div>
        <h1>create a Team</h1>
        <input type="text" placeholder="enter the group name" value={groupname} onChange={(e) => setGroupname(e.target.value)}/>
        <button onClick={handleGroups}>Create</button>
    </div>
  )
}
export default CreateGroup