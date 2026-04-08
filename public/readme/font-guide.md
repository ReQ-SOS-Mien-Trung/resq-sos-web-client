# Font Guide: SF UI Display + Tailwind CSS

Tài liệu này mô tả cách dùng font **SF UI Display** trong dự án với Tailwind classes.

## Cách sử dụng Font với Tailwind Classes

- **`font-sans`**: Dùng font SF UI Display (mặc định)
- **`font-mono`**: Cũng dùng SF UI Display (đã config)

## Font Weight Classes

- **`font-thin`** = weight 100  
- **`font-extralight`** = weight 200  
- **`font-light`** = weight 300  
- **`font-normal`** = weight 400  
- **`font-medium`** = weight 500  
- **`font-semibold`** = weight 600 *(ghi chú: sẽ dùng 500)*  
- **`font-bold`** = weight 700  
- **`font-extrabold`** = weight 800  
- **`font-black`** = weight 900  

## Demo với Tailwind Classes

Các ví dụ dưới đây minh hoạ cách kết hợp `font-...` với `font-sans`:

```tsx
<p className="text-2xl font-thin font-sans">ResQ SOS Miền Trung - Thin</p>
<p className="text-2xl font-extralight font-sans">ResQ SOS Mien Trung - Extralight</p>
<p className="text-2xl font-light font-sans">ResQ SOS Mien Trung - Light</p>
<p className="text-2xl font-normal font-sans">ResQ SOS Mien Trung - Normal</p>
<p className="text-2xl font-medium font-sans">ResQ SOS Mien Trung nguễn - Medium</p>
<p className="text-2xl font-semibold font-sans">ResQ SOS Miền Trung - Semibold</p>
<p className="text-2xl font-bold font-sans">ResQ SOS Miền Trung nguyễn - Bold</p>
<p className="text-2xl font-extrabold font-sans">ResQ SOS Mien Trung - Extrabold</p>
<p className="text-2xl font-black font-sans">ResQ SOS Mien Trung - Black</p>
```

## Ví dụ thực tế với các kích thước

```tsx
<p className="text-xs font-light">text-xs font-light - Cỡ chữ nhỏ nhất</p>
<p className="text-sm font-normal">text-sm font-normal - Cỡ chữ nhỏ</p>
<p className="text-base font-medium">text-base font-medium - Cỡ chữ mặc định</p>
<p className="text-lg font-semibold">text-lg font-semibold - Cỡ chữ lớn</p>
<p className="text-xl font-bold">text-xl font-bold - Cỡ chữ rất lớn</p>
<p className="text-2xl font-extrabold">text-2xl font-extrabold - Cỡ chữ cực lớn</p>
<p className="text-3xl font-black">text-3xl font-black - Cỡ chữ siêu lớn</p>
```

## Lưu ý

Mặc định `body` đã có **`font-sans`**, nhưng bạn có thể thêm class này vào bất kỳ element nào để đảm bảo dùng đúng font.

