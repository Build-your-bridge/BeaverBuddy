import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fff" }}>
          <Image
            src="/images/beaver/welcome_beaver2.png"
            alt="Welcome Beaver"
            width={200}
            height={200}
            className="mb-8"
            priority
          />
          <h1 className="mb-2 font-bold text-xl text-black text-center">BeaverBuddy AI</h1>
          <p className="mb-8 text-m font-bold text-gray-400 text-center max-w-xs">
            Your AI companion for wellbeing and learning Canadian culture
          </p>
          <Link href="/signup" passHref>
              <button className="btn-red">
              GET STARTED
            </button>
          </Link>
          <Link href="/login" passHref>
              <button className="btn-white">
              I ALREADY HAVE AN ACCOUNT
            </button>
          </Link>
    </main>
  );
}
