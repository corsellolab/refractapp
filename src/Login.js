// Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/Login.css'; // import the CSS
import refractLogo from './assets/refract_logo.png';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    if(response.ok) {
      navigate('/dashboard');
    } else {
      alert('Invalid username or password');
    }
  }

  return (
    <div className='login-container'>
      <img src={refractLogo} alt='Logo' className='logo' />
      <form onSubmit={handleSubmit} className='login-form'>
        <input type='text' placeholder='Username' onChange={e => setUsername(e.target.value)} value={username} />
        <input type='password' placeholder='Password' onChange={e => setPassword(e.target.value)} value={password} />
        <input type='submit' value='Login' />
      </form>
    </div>
  )
}

export default Login;
