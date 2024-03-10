import React, { useState, useEffect } from 'react';
import {Link} from 'react-router-dom';
import avatar from '../assets/profile.png'
import toast, { Toaster } from 'react-hot-toast';
import { useFormik } from 'formik';
import { profileValidation } from '../helper/validate'
import convertToBase64 from '../helper/convert';
import useFetch from '../hooks/fetch.hook';
import { useAuthStore } from '../store/store'
import { updateUser } from '../helper/helper'
import {useNavigate} from 'react-router-dom';

import styles from '../styles/Username.module.css';
import extend from '../styles/Profile.module.css';

export default function Profile(){

  const [file, setFile] = useState(localStorage.getItem('profile') || null); // Retrieve profile image from localStorage
  const { username } = useAuthStore(state => state.auth)
  const [{ isLoading, apiData, serverError }] = useFetch(`/user/${username}`)
  const navigate = useNavigate()

  const formik = useFormik({
    initialValues : {
      firstName: localStorage.getItem('firstName') || (apiData?.firstName || ''),
      lastName: localStorage.getItem('lastName') || (apiData?.lastName || ''),
      email: localStorage.getItem('email') || (apiData?.email || ''),
      mobile: localStorage.getItem('mobile') || (apiData?.mobile || ''),
      address: localStorage.getItem('address') || (apiData?.address || '')
    },
    enableReinitialize: true,
    validate : profileValidation,
    validateOnBlur: false,
    validateOnChange: false,
    onSubmit : async values => {
      values = await Object.assign(values, { profile : file || apiData?.profile || ''})

      let updatePromise = updateUser(values);

      toast.promise(updatePromise, {
        loading: 'Updating...',
        success : <b>Update Successfully...!</b>,
        error: <b>Could not Update!</b>
      });
    }
  })

  /** formik doensn't support file upload so we need to create this handler */
  const onUpload = async e => {
    const base64 = await convertToBase64(e.target.files[0]);
    setFile(base64);
    localStorage.setItem('profile', base64); // Store profile image in localStorage
  }

  // logout handler function
  function userLogout(){
    localStorage.removeItem('token');
    navigate('/')
  }

  useEffect(() => {
    localStorage.setItem('firstName', formik.values.firstName);
    localStorage.setItem('lastName', formik.values.lastName);
    localStorage.setItem('email', formik.values.email);
    localStorage.setItem('mobile', formik.values.mobile);
    localStorage.setItem('address', formik.values.address);
  }, [formik.values]);

  if(isLoading) return <h1 className='text-2xl font-bold'>isLoading</h1>;
  if(serverError) return <h1 className='text-xl text-red-500'>{serverError.message}</h1>


  return (
    <div className='container mx-auto'>

      <Toaster position='top-center' reverseOrder={false}></Toaster>
      <div className='flex justify-center items-center h-screen'>
        <div className={styles.glass} style={{width : '45%'}}>

          <div className='title flex flex-col items-center'>
            <h4 className='text-5xl font-bold'>Profile</h4>
            <span className='py-4 text-xl w-2/3 text-center text-gray-500'>
              Change your details
            </span>
          </div>

          <form className='py-1' onSubmit={formik.handleSubmit}>
            <div className='profile flex justify-center py-4'>
                <label htmlFor="profile">
                  <img src={apiData?.profile || file || avatar} className={styles.profile_img} alt="avatar" />
                </label>
                  
                <input onChange={onUpload} type="file" id='profile' name='profile' />
            </div>

            <div className='textbox flex flex-col items-center gap-6'>
                <div className="name flex w-3/4 gap-10">
                  <input {...formik.getFieldProps('firstName')} className={styles.textbox} type="text" placeholder='FirstName' />
                  <input {...formik.getFieldProps('lastName')} className={styles.textbox} type="text" placeholder='LastName' />
                </div>

                <div className="name flex w-3/4 gap-10">
                  <input {...formik.getFieldProps('mobile')} className={styles.textbox} type="text" placeholder='Mobile No.' />
                  <input {...formik.getFieldProps('email')} className={styles.textbox} type="text" placeholder='Email*' />
                </div>

               
                  <input {...formik.getFieldProps('address')} className={styles.textbox} type="text" placeholder='Address' />
                  <button className={styles.btn} type='submit'>Update</button>
            </div>

            <div className='text-center py-4'>
              <span className='text-gray-500'>come back later? <button onClick={userLogout} className='text-red-500' to="/">Logout</button></span>
            </div>
          </form>

        </div>
      </div>
    </div>
  )
}