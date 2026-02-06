import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Signup from './Components/Signup'
import { Route, Routes } from 'react-router-dom'
import Login from './Components/Login'
import Main from './Components/Main'
function App() {
  const [count, setCount] = useState(0)

  return (
      <div>
        <div>
        <Routes>
          <Route path='/' element={<Signup/>}/>
          <Route path='/login' element={<Login/>}/>
          <Route path='/main' element={<Main/>}/>
        </Routes>
        </div> 
      </div>
  )
}

export default App
