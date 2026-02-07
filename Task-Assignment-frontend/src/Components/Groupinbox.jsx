import { useEffect, useState } from "react"
import axios from "axios";
function Groupinbox({selectedTeam,groupInbox,setGroupInbox}) {
    // const [groupInbox,setGroupInbox] =useState([]);
   const API_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
      const handleGroupInbox = async() => {
      try{
        const token = localStorage.getItem("token");
        if(!token){
          console.error("token problem in groupInbox function")
        }
        const res = await axios.get(`${API_URL}/api/groups`,{
          headers:{
                    Authorization:`Bearer ${token}`
                }
        })
        setGroupInbox(res.data.groups ?? []);
        console.log(res.data.groups)
      }catch(err){
        console.error("somethig went wrong in groupinbox funtion")
      }  
    }
    handleGroupInbox()
    },[])
    
    const deleteGroup = async(groupId) => {
      try{
        const token = localStorage.getItem('token');
        if(!token) return;
        const res = await axios.delete(`${API_URL}/api/groups/${groupId}`,{
          headers:{
            Authorization:`Bearer ${token}`
          }
        })
        if(res.status===200){
          const removegroup =  groupInbox.filter((group) => group._id!==groupId)
          setGroupInbox(removegroup)
          alert("group is removed successfully")
        }
      }catch(err){
        console.error("delete fuction is not working",err)
      }
    }

  return (
    <div>
      <ul>
         {(groupInbox ?? []).filter(g => g && g._id).map((g) => (
          <li key={g?._id} onClick={() => g._id &&  selectedTeam(g._id)}>
            <h1>{g?.groupname ?? g?.groupName ?? "Unnamed"}</h1>
            <button onClick={(e) => {e.stopPropagation();if(g._id) deleteGroup(g._id)}}>remove</button>
          </li>
      ))}
      </ul>
    </div>
  )
}
export default Groupinbox