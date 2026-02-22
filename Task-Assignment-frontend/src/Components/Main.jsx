import { useEffect } from 'react';
import { useState } from 'react';
import io from 'socket.io-client'
import CreateGroup from './CreateGroup';
import Groupinbox from './Groupinbox';
import axios from 'axios';
import './Main.css';
import { jwtDecode } from "jwt-decode";
import Message from './Message';

function Main() {
  const [assignTask, setassignTask] = useState("");
  const [socket, setSocket] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [visibleTaskInputs, setVisibleTaskInputs] = useState({});
  const [showAddMember, setShowAddMember] = useState(false);
  const [groupInbox, setGroupInbox] = useState([]);
  const [messages, setMessages] = useState([]);
  const [mobileView, setMobileView] = useState('inbox'); // 'inbox', 'group', 'messages'

  const API_URL = import.meta.env.VITE_API_URL;

  const handleSelectedGroup = async (groupId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await axios.get(`${API_URL}/api/groups/${groupId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setSelectedGroup(res.data);
      setMobileView('group'); // Slide to group view on mobile
    } catch (err) {
      console.error("something went wrong in handleselected group function")
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const decode = jwtDecode(token);
    setCurrentUserId(decode.user.id);
    const newSocket = io(`${API_URL}`, {
      auth: { token },
    });

    newSocket.on('connect', () => {
      console.log("socket connected", newSocket.id)
    });

    newSocket.on('task-assigned-to-user', (data) => {
      setSelectedGroup(prev => {
        if (!prev || prev.groupId !== data.groupId) return prev;
        return {
          ...prev, members: prev.members.map(member =>
            member._id === data.toUserId ? {
              ...member,
              status: "BUSY",
              currentTask: data.task
            } : member
          )
        }
      })
    })

    newSocket.on('task-received', (data) => {
      setMessages(prev => Array.isArray(data) ? data : [...prev, data]);
    });

    newSocket.on('member-added', (data) => {
      setSelectedGroup(prev => {
        if (prev && prev.groupId === data.groupId) {
          const exists = prev.members.find(m => m._id === data.member._id);
          if (exists) return prev;
          return { ...prev, members: [...prev.members, data.member] };
        }
        return prev;
      });
    });

    newSocket.on('added-to-group', (newGroup) => {
      setGroupInbox(prev => {
        const exists = prev.find(g => g._id === newGroup._id);
        if (exists) return prev;
        return [...prev, newGroup];
      });
    });

    newSocket.on('member-removed-from-team', (data) => {
      setSelectedGroup(prev => {
        if (!prev || prev.groupId !== data.groupId) return prev;
        return {
          ...prev, members: prev.members.filter(member => member._id !== data.memberId)
        }
      })
    })

    newSocket.on('removed-from-team', (data) => {
      setGroupInbox(prev => prev.filter(group => group._id !== data.groupId));
      setSelectedGroup(prev => {
        if (prev?.groupId === data.groupId) {
          setMobileView('inbox');
          return null;
        }
        return prev;
      });
      alert("you were removed from team");
    })

    newSocket.on('deleted-group', (data) => {
      setGroupInbox(prev => prev.filter(group => group._id !== data.groupId));
      setSelectedGroup(prev => {
        if (prev && prev.groupId === data.groupId) {
          setMobileView('inbox');
          return null;
        }
        return prev;
      });
      alert(data.msg || "Group was deleted");
    })

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    }
  }, []);

  const handleAddMember = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !selectedGroup) return;
      const res = await axios.post(`${API_URL}/api/groups/addmembers`, {
        groupId: selectedGroup.groupId,
        memberEmail
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (res.status === 201) {
        alert("team member added successfully");
        setMemberEmail("");
        setShowAddMember(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add member");
    }
  }

  const sendTask = async (memberId) => {
    if (!socket) return;
    try {
      socket.emit('task-assigned', {
        toUserId: memberId,
        task: assignTask,
      })
      setassignTask("");
      setVisibleTaskInputs(prev => ({ ...prev, [memberId]: false }));
    } catch (err) {
      console.error("something went wrong while sending task");
    }
  }

  const handleRemoveMember = async (groupId, memberId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await axios.delete(`${API_URL}/api/groups/${groupId}/${memberId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

    } catch (err) {
      alert("Failed to remove member");
    }
  }

  return (
    <div className="Main">
      <div className={`sliding-wrapper view-${mobileView}`}>

        {/* Sidebar Left: 20% - Group Inbox */}
        <div className="sidebar-left leftside">
          <div className="panel-header">
            <h1>Teams</h1>
            <button onClick={() => setMobileView('messages')} className="mobile-only-btn" style={{ display: 'none' }}>Updates</button>
          </div>
          <div className="scroll-area">
            <CreateGroup groupInbox={groupInbox} setGroupInbox={setGroupInbox} />
            <Groupinbox
              selectedTeam={handleSelectedGroup}
              groupInbox={groupInbox}
              setGroupInbox={setGroupInbox}
            />
          </div>
        </div>

        {/* Center Content: 60% - Group Details & Tasks */}
        <div className="center-content rightside">
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button className="mobile-back-btn" onClick={() => setMobileView('inbox')}>←</button>
              <h2>{selectedGroup ? selectedGroup.groupname : "Select a group"}</h2>
            </div>
            {selectedGroup && (
              <button onClick={() => setMobileView('messages')} className="mobile-back-btn" style={{ fontSize: '1rem', marginLeft: 'auto' }}>Info</button>
            )}
          </div>
          <div className="scroll-area">
            {selectedGroup ? (
              <div>
                <ul>
                  {selectedGroup.members.map((member) => (
                    <li key={member._id}>
                      <h4>
                        {member.username}
                        <span className={`member-status ${member.status === "BUSY" ? 'status-busy' : 'status-free'}`}>
                          {member.status}
                        </span>
                      </h4>
                      {member._id !== currentUserId ? (
                        <>
                          {member.status === "BUSY" && member.currentTask && (
                            <div className="current-task-display">
                              <p><strong>Task:</strong> {member.currentTask?.task}</p>
                              <p><strong>From:</strong> {member.currentTask?.from?.email}</p>
                            </div>
                          )}
                          <div className="task-actions">
                            {visibleTaskInputs[member._id] && (
                              <input
                                type="text"
                                placeholder='Enter the task'
                                value={assignTask}
                                onChange={(e) => setassignTask(e.target.value)}
                              />
                            )}
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button onClick={visibleTaskInputs[member._id] ? () => sendTask(member._id) : () => setVisibleTaskInputs(prev => ({ ...prev, [member._id]: true }))}>
                                {visibleTaskInputs[member._id] ? 'Send' : 'Assign'}
                              </button>
                              <button onClick={() => handleRemoveMember(selectedGroup.groupId, member._id)} style={{ background: 'rgba(255,0,0,0.1)' }}>Remove</button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="my-task-card">
                          <p style={{ color: '#00e5ff', fontWeight: 'bold' }}>MY TASKS</p>
                          <p>{member.currentTask?.task || "No current task"}</p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="add-member-section">
                  {showAddMember ? (
                    <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                      <input
                        type="text"
                        placeholder='Member Email'
                        value={memberEmail}
                        onChange={(e) => setMemberEmail(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button onClick={handleAddMember}>Add</button>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddMember(true)} style={{ width: '100%' }}>+ ADD MEMBER</button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
                <p>Welcome! Select a team to start assigning tasks.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Right: 20% - Messages/Updates */}
        <div className="sidebar-right">
          <div className="panel-header">
            <button className="mobile-back-btn" onClick={() => setMobileView('group')}>←</button>
            <h2>Updates</h2>
          </div>
          <div className="scroll-area">
            <Message setMessages={setMessages} message={messages} />
          </div>
        </div>

      </div>
    </div>
  )
}

export default Main;

{/* <> 
<input type="text" placeholder='Enter the task' value={assignTask} onChange={(e) => setassignTask(e.target.value)} className={visibleTaskInputs[member._id] ? 'visible' : 'hidden'}/> 
<button onClick={visibleTaskInputs[member._id] ? () => sendTask(member._id) : () => setVisibleTaskInputs(prev => ({...prev, [member._id]: !prev[member._id]}))} >{visibleTaskInputs[member._id] ? 'Send Task' : 'Assign a task'}</button> 
</> */}