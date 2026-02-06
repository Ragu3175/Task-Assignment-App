import { useEffect } from 'react';
import { useState } from 'react';
import io from 'socket.io-client'
import CreateGroup from './CreateGroup';
import Groupinbox from './Groupinbox';
import axios from 'axios';
import './Main.css';
import {jwtDecode} from "jwt-decode";
import { useRef } from 'react';
function Main() {
  const [assignTask,setassignTask] = useState("");
  const [acknowledgment,setAcknowledgment] = useState("");
  const [socket,setSocket] =useState(null);
  const [selectedGroup,setSelectedGroup] = useState(null);
  const [memberEmail,setMemberEmail] = useState("");
  const [myTask,setMyTask] = useState(null);
  const [currentUserId,setCurrentUserId] = useState(null);
  const [visibleTaskInputs, setVisibleTaskInputs] = useState({});
  const [showAddMember, setShowAddMember] = useState(false);
   const [groupInbox,setGroupInbox] =useState([]);

  const handleSelectedGroup = async(groupId) => {
    try{
      const token = localStorage.getItem("token");
      if(!token) return;
      const res = await axios.get(`http://localhost:5000/api/groups/${groupId}`,{
        headers:{
          Authorization:`Bearer ${token}`
        }
      })
      console.log(res.data)
      // setSelectedGroup({groupId,member:res.data.members});
      setSelectedGroup(res.data)
    }catch(err){
      console.error("something went wrong in handleselected group fuction")
    }
  }

  useEffect(() => {
  
       const token =  localStorage.getItem('token');
        console.log("token:",token)

        if(!token) {
          console.log("no token provided,socked is not connected")
          return;
        }

        const decode = jwtDecode(token);
        setCurrentUserId(decode.user.id)
        const newSocket = io('http://localhost:5000',{
          auth:{token},
        });
        
        newSocket.on('connect',() => {
          console.log("socket connected",newSocket.id)
        });
        newSocket.on('task-assigned-to-user',(data) => {
          console.log(data)
          setSelectedGroup(prev => {
            if(!prev) return prev;
            return {...prev,members:prev.members.map(member => 
              member._id === data.toUserId?{
                ...member,
                status:"BUSY",
                currentTask:data.task
              }:member
            )}
          })
        })
        newSocket.on('task-received',(data) => {
          setAcknowledgment(data);
        });
        setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    } 
  },[])

  const handleAddMember = async(groupId) => {
    try{
      const token = localStorage.getItem('token');
      if(!token) return;
      const res = await axios.post("http://localhost:5000/api/groups/addmembers",{
        groupId:selectedGroup.groupId,
        memberEmail
      },{
        headers:{
          Authorization:`Bearer ${token}`
        }
      })
      if(res.status===201){
        console.log("team member added succesfully")
        alert("team member added succesfully")
      }
    }catch(err){
      console.error(err.response?.data?.message);
      alert(err.response?.data?.message);
    }
  }
 const sendTask = async(memberId) => {
  try{
    socket.emit('task-assigned',{
      toUserId:memberId,
      task:assignTask,
    })
  }catch(err){
    console.error("something went wrong while sending task");
  }
 }

  return (
    <div>
      <div className='Main'>
        <div className='leftside'>
          <h1>Home</h1>
            <CreateGroup 
              groupInbox={groupInbox}
              setGroupInbox={setGroupInbox}
            />
            <Groupinbox 
              selectedTeam={handleSelectedGroup}
              groupInbox={groupInbox}
              setGroupInbox={setGroupInbox}
            />
        </div>
         
        <div className='rightside'>
            {selectedGroup ?(
              <div>
                <h1></h1>
                <ul>
                  {selectedGroup.members.map((member) => (
                    <li key={member._id}>
                      <h4>{member.username}
                        {member.status === "BUSY" ?(<span style={{color:'red'}}>BUSY</span>):<span style={{color:'green'}}>FREE</span>}
                      </h4>
                      {member._id !== currentUserId ?(
                        <>
                        {member.status === "BUSY" && member.currentTask && (
                          <>
                        <div>
                          <p>Task : {member.currentTask?.task}</p>
                          <p>From: {member.currentTask?.from?.email}</p>
                        </div>
                        </>)}
                        <div>
                          <input type="text" placeholder='Enter the task' value={assignTask} onChange={(e) => setassignTask(e.target.value)} className={visibleTaskInputs[member._id] ? 'visible' : 'hidden'}/> 
                          <button onClick={visibleTaskInputs[member._id] ? () => sendTask(member._id) : () => setVisibleTaskInputs(prev => ({...prev, [member._id]: !prev[member._id]}))} >{visibleTaskInputs[member._id] ? 'Send Task' : 'Assign a task'}</button> 
                        </div>
                        </>
                      ):(
                        <>
                        <p style={{color:'blue'}}>YOU</p>
                        <h1>my tasks</h1>
                        <p>{member.currentTask?.task || "no task is assigned"}</p>
                        <p>{member.currentTask?.from?.email || "N/A"}</p>
                        </>
                      )}
                      
                    </li>
                   ))}
                </ul>
                <div className="add-member-section">
                  <input type="text" placeholder='Enter the member email' value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} className={showAddMember ? 'visible' : 'hidden'}/>
                  <button onClick={showAddMember ? () => handleAddMember(selectedGroup.groupId) : () => setShowAddMember(true)} >{showAddMember ? 'Add Member' : 'ADD+'}</button>
                </div>
              </div>
            ):(
              <p>select any group</p>
            )}
        </div>
      </div>
    </div>
  )
}
export default Main

{/* <> 
<input type="text" placeholder='Enter the task' value={assignTask} onChange={(e) => setassignTask(e.target.value)} className={visibleTaskInputs[member._id] ? 'visible' : 'hidden'}/> 
<button onClick={visibleTaskInputs[member._id] ? () => sendTask(member._id) : () => setVisibleTaskInputs(prev => ({...prev, [member._id]: !prev[member._id]}))} >{visibleTaskInputs[member._id] ? 'Send Task' : 'Assign a task'}</button> 
</> */}