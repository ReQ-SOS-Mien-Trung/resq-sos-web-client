const Home = () => {
  return (
    <div className="min-h-screen p-8 space-y-8 bg-background">
      <h1 className="text-4xl font-bold mb-8 font-sans">
        Test Font SF UI Display với Tailwind CSS
      </h1>

      {/* Giải thích cách dùng */}
      <div className="mb-8 p-6 bg-muted rounded-lg border">
        <h2 className="text-2xl font-bold mb-4 font-sans">
          Cách sử dụng Font với Tailwind Classes:
        </h2>
        <div className="space-y-2 text-sm font-sans">
          <p>
            <code className="bg-background px-2 py-1 rounded">font-sans</code> -
            Dùng font SF UI Display (mặc định)
          </p>
          <p>
            <code className="bg-background px-2 py-1 rounded">font-mono</code> -
            Cũng dùng SF UI Display (đã config)
          </p>
          <p className="mt-4 font-semibold">Font Weight Classes:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>
              <code className="bg-background px-2 py-1 rounded">font-thin</code>{" "}
              = weight 100
            </li>
            <li>
              <code className="bg-background px-2 py-1 rounded">
                font-extralight
              </code>{" "}
              = weight 200
            </li>
            <li>
              <code className="bg-background px-2 py-1 rounded">
                font-light
              </code>{" "}
              = weight 300
            </li>
            <li>
              <code className="bg-background px-2 py-1 rounded">
                font-normal
              </code>{" "}
              = weight 400
            </li>
            <li>
              <code className="bg-background px-2 py-1 rounded">
                font-medium
              </code>{" "}
              = weight 500
            </li>
            <li>
              <code className="bg-background px-2 py-1 rounded">
                font-semibold
              </code>{" "}
              = weight 600 (sẽ dùng 500)
            </li>
            <li>
              <code className="bg-background px-2 py-1 rounded">font-bold</code>{" "}
              = weight 700
            </li>
            <li>
              <code className="bg-background px-2 py-1 rounded">
                font-extrabold
              </code>{" "}
              = weight 800
            </li>
            <li>
              <code className="bg-background px-2 py-1 rounded">
                font-black
              </code>{" "}
              = weight 900
            </li>
          </ul>
        </div>
      </div>

      {/* Demo với Tailwind Classes */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold mb-4 font-sans">
          Demo với Tailwind Classes:
        </h2>

        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground mb-2 font-sans">
            font-thin (100)
          </p>
          <p className="text-2xl font-thin font-sans">
            ResQ SOS Miền Trung - Thin
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground mb-2 font-sans">
            font-extralight (200)
          </p>
          <p className="text-2xl font-extralight font-sans">
            ResQ SOS Mien Trung - Extralight
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground mb-2 font-sans">
            font-light (300)
          </p>
          <p className="text-2xl font-light font-sans">
            ResQ SOS Mien Trung - Light
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground mb-2 font-sans">
            font-normal (400)
          </p>
          <p className="text-2xl font-normal font-sans">
            ResQ SOS Mien Trung - Normal
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground mb-2 font-sans">
            font-medium (500)
          </p>
          <p className="text-2xl font-medium font-sans">
            ResQ SOS Mien Trung nguễn - Medium
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground mb-2 font-sans">
            font-semibold (600 → sẽ dùng 500)
          </p>
          <p className="text-2xl font-semibold font-sans">
            ResQ SOS Miền Trung - Semibold
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground mb-2 font-sans">
            font-bold (700)
          </p>
          <p className="text-2xl font-bold font-sans">
            ResQ SOS Miền Trung nguyễn - Bold
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground mb-2 font-sans">
            font-extrabold (800)
          </p>
          <p className="text-2xl font-extrabold font-sans">
            ResQ SOS Mien Trung - Extrabold
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground mb-2 font-sans">
            font-black (900)
          </p>
          <p className="text-2xl font-black font-sans">
            ResQ SOS Mien Trung - Black
          </p>
        </div>
      </div>

      {/* Ví dụ thực tế */}
      <div className="mt-12 p-6 border rounded-lg bg-card">
        <h2 className="text-2xl font-bold mb-4 font-sans">
          Ví dụ thực tế với các kích thước:
        </h2>
        <div className="space-y-3 font-sans">
          <p className="text-xs font-light">
            text-xs font-light - Cỡ chữ nhỏ nhất
          </p>
          <p className="text-sm font-normal">
            text-sm font-normal - Cỡ chữ nhỏ
          </p>
          <p className="text-base font-medium">
            text-base font-medium - Cỡ chữ mặc định
          </p>
          <p className="text-lg font-semibold">
            text-lg font-semibold - Cỡ chữ lớn
          </p>
          <p className="text-xl font-bold">
            text-xl font-bold - Cỡ chữ rất lớn
          </p>
          <p className="text-2xl font-extrabold">
            text-2xl font-extrabold - Cỡ chữ cực lớn
          </p>
          <p className="text-3xl font-black">
            text-3xl font-black - Cỡ chữ siêu lớn
          </p>
        </div>
      </div>

      {/* Lưu ý */}
      <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-sm font-medium font-sans">
          💡 Lưu ý: Mặc định body đã có{" "}
          <code className="bg-background px-1 rounded">font-sans</code>, nhưng
          bạn có thể thêm class này vào bất kỳ element nào để đảm bảo dùng đúng
          font.
        </p>
      </div>
    </div>
  );
};

export default Home;
