"use client";
import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { useAuthState } from "react-firebase-hooks/auth";

export default function Stats({ api_route }: { api_route: string }) {
  const [stats, setStats] = useState(null);
  const [user, loading] = useAuthState(auth);

  useEffect(() => {
    const fetchStats = async () => {
      const response = await fetch(api_route + "/stats", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user?.getIdToken()}`,
        },
      });
      if (response.status === 200) {
        const json = await response.json();
        setStats(json);
      } else {
        setStats(null);
      }
    };
    fetchStats();
  }, [api_route, user?.uid]);

  return loading ? (
    <span className="font-bold text-red-800">Loading...</span>
  ) : stats ? (
    <span className="font-bold text-red-800">Competition not yet started.</span>
  ) : (
    <div className="font-bold text-red-800 flex flex-col gap-2">
      <span>Permission denied.</span>
      <span>
        Check whether you are logged in
        <br />
        with the correct account.
      </span>
    </div>
  );
}
