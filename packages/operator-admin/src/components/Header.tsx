'use client';

import React from 'react';

export function Header() {
  return (
    <header className='bg-white border-b border-gray-200 px-6 py-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-2'>
          <div className='w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center'>
            <span className='text-white font-bold text-lg'>r</span>
          </div>
          <span className='text-2xl font-bold text-blue-600'>rapira</span>
        </div>
        
        <div className='flex items-center space-x-6'>
          <span className='text-gray-700'>Операторская панель</span>
          
          {/* Уведомления */}
          <button className='relative p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100'>
            <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 17h5l-5 5v-5zM4.19 4H20c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4.19c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z' />
            </svg>
            <span className='absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center'>
              3
            </span>
          </button>
          
          {/* Профиль оператора */}
          <div className='flex items-center space-x-3'>
            <div className='w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center'>
              <span className='text-gray-700 font-semibold text-sm'>D</span>
            </div>
            <div className='text-sm'>
              <p className='font-medium text-gray-900'>Оператор</p>
              <p className='text-gray-500'>Онлайн</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
