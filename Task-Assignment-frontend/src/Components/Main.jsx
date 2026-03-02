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
  const [mobileView, setMobileView] = useState(() => {
    return localStorage.getItem("mobileView") || 'inbox';
  }); // 'inbox', 'group', 'messages'
  const [updateStatus, setUpdateStatus] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDarkMode ? "dark" : "light");
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem("mobileView", mobileView);
  }, [mobileView]);

  const handleSelectedGroup = async (groupId, shouldChangeView = true) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      localStorage.setItem("selectedGroupId", groupId);
      const res = await axios.get(`${API_URL}/api/groups/${groupId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setSelectedGroup(res.data);
      if (shouldChangeView) {
        setMobileView('group'); // Slide to group view on mobile
      }

      // Fetch group messages
      const msgRes = await axios.get(`${API_URL}/api/groups/${groupId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setMessages(msgRes.data);
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

    newSocket.on('task-completion-update', (data) => {
      setSelectedGroup(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          members: prev.members.map(member =>
            member._id === data.existmember._id
              ? { ...member, status: data.existmember.status, currentTask: null }
              : member
          )
        };
      });

    })
    newSocket.on('task-completion-msg', (data) => {
      setMessages(prev => Array.isArray(data) ? data : [...prev, data])
    })

    setSocket(newSocket);

    // [PERSISTENCE] Restore selected group details on refresh
    const savedGroupId = localStorage.getItem("selectedGroupId");

    if (savedGroupId) {
      // Use setTimeOut to ensure state is ready if needed, 
      // but usually handleSelectedGroup is fine here.
      handleSelectedGroup(savedGroupId, false);
    }

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
        groupId: selectedGroup.groupId,
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

  const handleUpdateStatus = async (groupId, memberId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.put(`${API_URL}/api/groups/${groupId}/${memberId}`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error(err.response?.data?.message || "something went wrong while in frontend handleUpdateStatus")
    }
  }

  return (
    <div className={`MainContainer ${isDarkMode ? 'dark' : ''}`}>
      <div className={`sliding-wrapper view-${mobileView}`}>

        {/* --- Column 1: Teams Sidebar --- */}
        <aside className="sidebar-left teams-column">
          <header className="column-header">
            <div className="header-info">
              <h1>TaskFlow</h1>
              <p className="user-email">{localStorage.getItem("email")}</p>
            </div>
            <button
              className="theme-toggle"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title="Toggle Theme"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </header>

          <div className="scroll-area">
            <CreateGroup groupInbox={groupInbox} setGroupInbox={setGroupInbox} />
            <div className="section-divider">Teams</div>
            <Groupinbox
              selectedTeam={handleSelectedGroup}
              groupInbox={groupInbox}
              setGroupInbox={setGroupInbox}
            />
          </div>

          <button onClick={() => setMobileView('messages')} className="mobile-fab">
            Updates
          </button>
        </aside>

        {/* --- Column 2: Dashboard/Tasks --- */}
        <main className="center-content task-column">
          <header className="column-header">
            <button className="mobile-btn icon-btn" onClick={() => setMobileView('inbox')}>❮</button>
            <div className="group-title-area">
              <h2>{selectedGroup ? selectedGroup.groupname : "Active Dashboard"}</h2>
              {selectedGroup && <span className="member-count">{selectedGroup.members.length} Members</span>}
            </div>
            {selectedGroup && (
              <button onClick={() => setMobileView('messages')} className="info-btn-mobile">ⓘ</button>
            )}
          </header>

          <div className="scroll-area">
            {selectedGroup ? (
              <div className="dashboard-grid">

                {/* My Task Section */}
                {(() => {
                  const me = selectedGroup.members.find(m => m._id.toString() === currentUserId?.toString());
                  return me ? (
                    <section className="my-task-section">
                      <div className="section-label">MY ASSIGNMENT</div>
                      <div className="premium-task-card mine">
                        <div className="task-body">
                          <h3>{me.currentTask?.task || "Focused & Ready"}</h3>
                          {me.currentTask?.from && (
                            <p className="task-meta">Assigned by: <span>{me.currentTask.from.username || me.currentTask.from.email}</span></p>
                          )}
                        </div>
                        {me.currentTask && (
                          <button
                            className="complete-btn"
                            onClick={() => handleUpdateStatus(selectedGroup.groupId, me._id)}
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    </section>
                  ) : null;
                })()}

                {/* Team Management */}
                <section className="team-section">
                  <div className="section-header">
                    <div className="section-label">TEAM MEMBERS</div>
                  </div>

                  {showAddMember && (
                    <div className="add-member-form animate-in">
                      <div className="form-inner">
                        <input
                          type="email"
                          placeholder="Invite by email address..."
                          value={memberEmail}
                          onChange={(e) => setMemberEmail(e.target.value)}
                        />
                        <button className="primary" onClick={handleAddMember}>Send Invite</button>
                        <button className="cancel-mobile-btn" onClick={() => setShowAddMember(false)}>Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="member-list">
                    {selectedGroup.members.map((member) => (
                      member._id !== currentUserId && (
                        <div key={member._id} className="premium-member-card">
                          <div className="member-header">
                            <div className="member-info-main">
                              <div className="member-avatar">{member.username.charAt(0)}</div>
                              <div className="member-name-group">
                                <h4>{member.username}</h4>
                                <span className={`badge ${member.status.toLowerCase()}`}>{member.status}</span>
                              </div>
                            </div>
                            <button className="remove-btn" onClick={() => handleRemoveMember(selectedGroup.groupId, member._id)}>×</button>
                          </div>

                          <div className="member-task-area">
                            {member.status === "BUSY" ? (
                              <div className="active-task-display">
                                <p className="task-text">{member.currentTask?.task}</p>
                                <p className="assigned-by">Assigned by: {member.currentTask?.from?.username}</p>
                              </div>
                            ) : (
                              <div className="assign-input-group">
                                <input
                                  type="text"
                                  placeholder="Assign a task..."
                                  value={assignTask}
                                  onChange={(e) => setassignTask(e.target.value)}
                                  className={visibleTaskInputs[member._id] ? 'visible' : 'hidden'}
                                />
                                <button
                                  className={visibleTaskInputs[member._id] ? 'primary' : 'secondary'}
                                  onClick={visibleTaskInputs[member._id] ? () => sendTask(member._id) : () => setVisibleTaskInputs(prev => ({ ...prev, [member._id]: true }))}
                                >
                                  {visibleTaskInputs[member._id] ? 'Assign Now' : 'Assign Task'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📂</div>
                <h3>Welcome to TaskFlow</h3>
                <p>Select a team from the left sidebar to start managing your daily assignments and track progress in real-time.</p>
              </div>
            )}
          </div>
          {selectedGroup && (
            <button
              className="whatsapp-fab"
              onClick={() => setShowAddMember(!showAddMember)}
              title="Add Member"
            >
              {showAddMember ? '×' : '+'}
            </button>
          )}
        </main>

        {/* --- Column 3: Updates Feed --- */}
        <aside className="sidebar-right updates-column">
          <header className="column-header">
            <button className="mobile-btn icon-btn" onClick={() => setMobileView('group')}>❮</button>
            <h2>Activity Logs</h2>
          </header>
          <div className="scroll-area">
            <Message setMessages={setMessages} message={messages} />
          </div>
        </aside>

      </div>
    </div>
  )
}

export default Main;

{/* <> 
<input type="text" placeholder='Enter the task' value={assignTask} onChange={(e) => setassignTask(e.target.value)} className={visibleTaskInputs[member._id] ? 'visible' : 'hidden'}/> 
<button onClick={visibleTaskInputs[member._id] ? () => sendTask(member._id) : () => setVisibleTaskInputs(prev => ({...prev, [member._id]: !prev[member._id]}))} >{visibleTaskInputs[member._id] ? 'Send Task' : 'Assign a task'}</button> 
</> */}