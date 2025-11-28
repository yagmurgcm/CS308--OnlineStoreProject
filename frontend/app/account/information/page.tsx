"use client";

import { useEffect, useState } from "react";

export default function AccountInformationPage() {
  // örnek user verisi – backend bağlayınca buraya GET request atacaz
  const [user, setUser] = useState({
    firstName: "Arda",
    lastName: "Karayel",
    email: "ardakarayel033@gmail.com",
    phone: "+90 555 000 0000",
    company: " BUrası geçici böyle backendden alcaz",
  });

  useEffect(() => {
    // ileride backend'den /users/me çekilecek
    // fetch("http://localhost:3001/users/me")
    //   .then((res) => res.json())
    //   .then((data) => setUser(data));
  }, []);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-6">My Account</h1>
      <h2 className="text-xl font-semibold mb-6">Account Information</h2>

      {/* USER INFO LIST */}
      <div className="space-y-4 text-sm">
        <div>
          <div className="text-gray-500">First Name</div>
          <div className="font-medium">{user.firstName}</div>
        </div>

        <div>
          <div className="text-gray-500">Last Name</div>
          <div className="font-medium">{user.lastName}</div>
        </div>

        <div>
          <div className="text-gray-500">Email Address</div>
          <div className="font-medium">{user.email}</div>
        </div>

        <div>
          <div className="text-gray-500">Phone Number</div>
          <div className="font-medium">{user.phone}</div>
        </div>

        <div>
          <div className="text-gray-500">Company</div>
          <div className="font-medium">{user.company}</div>
        </div>
      </div>
    </div>
  );
}
