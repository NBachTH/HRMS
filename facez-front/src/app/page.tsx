import React from 'react'
import { LoginForm } from '@/app/components/login/LoginForm'
export default function LoginPage() {
    return (
        <div className="flex flex-col min-h-screen w-full bg-slate-50">
            {/* Header */}
            {/*<header className="p-5">*/}
            {/*    <h1 className="text-2xl font-bold text-blue-900">HRMS</h1>*/}
            {/*</header>*/}
            {/* Main content */}
            <main className="flex flex-1 px-4 md:px-8 lg:px-16 py-8">
                <div className="flex w-full max-w-7xl mx-auto">
                    {/* Left column - Brand messaging */}
                    <div className="hidden md:flex md:flex-col md:justify-center md:w-1/2 pr-8">
                        <h2 className="text-5xl font-bold text-gray-800 mb-4">
                            HRMS
                        </h2>
                        <h2 className="text-5xl font-bold text-blue-900 mb-8">
                            for your business
                        </h2>
                        <p className="text-gray-600">
                            * This is a demo
                        </p>
                    </div>
                    {/* Right column - login form */}
                    <div className="w-full md:w-1/2 flex items-center justify-center">
                        <LoginForm />
                    </div>
                </div>
            </main>
        </div>
    )
}
