// src/pages/EditEntries.tsx
import { useEffect, useState } from "react";
import { getSales, deleteSale } from "../db/client";

export default function EditEntries() {
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => {
    getSales().then(setSales);
  }, []);

  async function handleDelete(id: number) {
    await deleteSale(id);
    setSales(await getSales());
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Edit Entries</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">ID</th><th>Total</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          {sales.map((s) => (
            <tr key={s.id} className="border-b">
              <td className="py-2">{s.id}</td>
              <td>{s.total}</td>
              <td>{s.payment_status}</td>
              <td>
                <button onClick={() => handleDelete(s.id)} className="text-red-600 text-sm">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}