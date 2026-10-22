import { startTransition, type FormEvent } from "react";

/**
 * onSubmit yang memanggil action tanpa reset otomatis React 19 (`<form action>` mengosongkan
 * input setelah submit). Dipakai di form panjang agar isian tidak hilang saat ada error validasi.
 * WAJIB pasang `method="post"` di <form>: kalau JS belum siap, browser tidak mengirim isian lewat URL.
 * Jangan dipakai untuk form berisi password.
 */
export function submitKeepingValues(action: (formData: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => action(formData));
  };
}
