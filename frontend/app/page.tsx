import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fff" }}>
          <Image
            src="/images/beaver/welcome_beaver2.png"
            alt="Welcome Beaver"
            width={220}
            height={220}
            className="mb-8"
            priority
          />
          <h1 className="mb-2 font-bold text-xl text-black text-center">BeaverBuddy AI</h1>
          <p className="mb-8 text-m font-medium text-gray-400 text-center max-w-xs">
            Your AI companion for wellbeing and learning Canadian culture
          </p>
          <div className="w-70 mx-auto flex flex-col items-center justify-center">
          <Link href="/signup" passHref className="w-full">
                <button className="btn-red w-full mb-4 whitespace-nowrap">
              GET STARTED
            </button>
          </Link>
          <Link href="/login" passHref className="w-full">
                <button className="btn-white w-full whitespace-nowrap">
              I ALREADY HAVE AN ACCOUNT
            </button>
          </Link>
          </div>

    </main>
  );
}
