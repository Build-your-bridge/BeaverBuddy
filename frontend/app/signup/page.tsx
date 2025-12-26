import Image from "next/image";
import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white font-sans">
      <div className="w-93/100 max-w-sm p-8 bg-white rounded-lg flex flex-col items-center">
          <h1 className="self-start text-4xl font-bold mb-2 text-black">Create an Account</h1>
          <div className="self-start w-16 h-1 bg-[#CE5C5C] rounded-full mb-6"></div>
        <form className="w-full flex flex-col gap-4">
          <input
            type="text"
            placeholder="Name"
            className="input-field"
          />
          <input
            type="password"
            placeholder="Email"
            className="input-field"
          />
            <input
            type="password"
            placeholder="Password"
            className="input-field"
          />
          <button
            type="submit"
            className="btn-red"
          >
            CREATE ACCOUNT
          </button>
        </form>
      </div>
    </main>
  );
}
