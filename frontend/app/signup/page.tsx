'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';

export default function Page() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(api.auth.signup, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      // Save token to localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Clear any old generic quest data (from before user-specific keys)
      localStorage.removeItem('questGeneratedDate');
      sessionStorage.removeItem('generatedQuests');
      sessionStorage.removeItem('monthlyQuests');
      sessionStorage.removeItem('journalPrompts');

      // Redirect to dashboard or home
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white font-sans">
      <div className="w-93/100 max-w-sm p-8 bg-white rounded-lg flex flex-col items-center">
        <h1 className="self-start text-4xl font-bold mb-2 text-black">Create an Account</h1>
        <div className="self-start w-16 h-1 bg-[#CE5C5C] rounded-full mb-6"></div>

        {error && (
          <div className="w-full mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Name"
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="btn-red"
            disabled={loading}
          >
            {loading ? 'CREATING...' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-[#CE5C5C] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}