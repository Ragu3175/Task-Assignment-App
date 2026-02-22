
import axios from "axios";
import { useState } from "react"

function CreateGroup({ groupInbox, setGroupInbox }) {
    const [groupname, setGroupname] = useState("");
    const [showInput, setShowInput] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL;

    const handleGroups = async () => {
        if (!showInput) {
            setShowInput(true);
            return;
        }

        if (!groupname.trim()) {
            setShowInput(false);
            setGroupname("");
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) throw (new Error({ message: "token is not provided in handleGroups " }));
            const res = await axios.post(`${API_URL}/api/groups`, {
                groupname
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            if (res.status === 201) {
                const groupres = await axios.get(`${API_URL}/api/groups`,
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                setGroupInbox(groupres.data.groups ?? []);
                setGroupname("")
                setShowInput(false)
            }
        } catch (err) {
            console.error("something went wront in frontend in inbox function", err.message)
        }
    }

    return (
        <div className="create-group-container">
            {showInput && (
                <input
                    type="text"
                    placeholder="Enter group name"
                    value={groupname}
                    onChange={(e) => setGroupname(e.target.value)}
                    className="create-group-input"
                    autoFocus
                />
            )}
            <button
                className="create-group-btn-wide"
                onClick={handleGroups}
            >
                {showInput ? (groupname.trim() ? 'Create Team' : 'Cancel') : '+ Create Team'}
            </button>
        </div>
    )
}

export default CreateGroup
