import Image from "next/image";
import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white font-sans">
      <div className="w-full max-w-sm p-8 bg-white rounded-lg flex flex-col items-center">
          <h1 className="self-start text-4xl font-bold mb-2 text-black">Create an Account</h1>
          <div className="self-start w-16 h-1 bg-[#CE5C5C] rounded-full mb-6"></div>
        <form className="w-full flex flex-col gap-4">
          <input
            type="text"
            placeholder="Name"
            className="text-sm text-black w-full px-4 py-2 border border-gray-300 rounded-lg font-bold bg-[#F7F7F7]"
          />
          <input
            type="password"
            placeholder="Email"
            className="text-sm text-black w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none font-bold bg-[#F7F7F7]"
          />
            <input
            type="password"
            placeholder="Password"
            className="text-sm text-black w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none font-bold bg-[#F7F7F7]"
          />
          <button
            type="submit"
            className="w-full py-3 mt-2 bg-[#CE5C5C] text-white font-bold rounded-lg shadow-md hover:bg-[#b94d4d] transition-colors"
          >
            CREATE ACCOUNT
          </button>
        </form>
      </div>
    </main>
  );
}
