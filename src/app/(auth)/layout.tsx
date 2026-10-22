export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-primary text-lg font-extrabold text-primary-foreground">
            HR
          </div>
          <p className="text-sm text-muted-foreground">Sistem Informasi SDM</p>
        </div>
        {children}
      </div>
    </main>
  );
}
