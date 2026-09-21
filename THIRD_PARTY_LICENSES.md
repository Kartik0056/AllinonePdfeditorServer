# Third-Party Licenses

This project uses the following open-source libraries. All libraries have been verified
to have permissive licenses suitable for commercial use.

## Core PDF Libraries

| Library | Version | License | Purpose |
|---------|---------|---------|---------|
| [pdf-lib](https://github.com/Hopding/pdf-lib) | ^1.17.1 | MIT | PDF creation, modification, merging, splitting |
| [pdfjs-dist](https://github.com/nicolo-ribaudo/pdfjs-dist) | ^4.7.76 | Apache-2.0 | PDF rendering, text extraction |
| [pako](https://github.com/nicolo-ribaudo/pako) | ^2.1.0 | MIT/zlib | Content stream compression/decompression |

## Canvas & Graphics

| Library | Version | License | Purpose |
|---------|---------|---------|---------|
| [fabric](https://github.com/fabricjs/fabric.js) | ^6.4.0 | MIT | Canvas-based annotation layer |

## Image Processing

| Library | Version | License | Purpose |
|---------|---------|---------|---------|
| [sharp](https://github.com/lovell/sharp) | ^0.33.0 | Apache-2.0 | Image conversion and processing |

## OCR

| Library | Version | License | Purpose |
|---------|---------|---------|---------|
| [tesseract.js](https://github.com/nicolo-ribaudo/tesseract.js) | ^5.1.1 | Apache-2.0 | Client-side OCR for scanned PDFs |

## Frontend

| Library | Version | License | Purpose |
|---------|---------|---------|---------|
| [react](https://github.com/facebook/react) | ^18.3.1 | MIT | UI framework |
| [react-dom](https://github.com/facebook/react) | ^18.3.1 | MIT | React DOM rendering |
| [react-router-dom](https://github.com/remix-run/react-router) | ^6.27.0 | MIT | Client-side routing |
| [zustand](https://github.com/pmndrs/zustand) | ^5.0.0 | MIT | State management |
| [axios](https://github.com/axios/axios) | ^1.7.7 | MIT | HTTP client |
| [lucide-react](https://github.com/lucide-icons/lucide) | ^0.453.0 | ISC | Icon library |
| [vite](https://github.com/vitejs/vite) | ^5.4.10 | MIT | Build tool |
| [tailwindcss](https://github.com/tailwindlabs/tailwindcss) | ^3.4.14 | MIT | CSS framework |

## Backend

| Library | Version | License | Purpose |
|---------|---------|---------|---------|
| [express](https://github.com/expressjs/express) | ^4.21.0 | MIT | HTTP server framework |
| [mongoose](https://github.com/Automattic/mongoose) | ^8.7.0 | MIT | MongoDB ODM |
| [multer](https://github.com/expressjs/multer) | ^1.4.5-lts.1 | MIT | File upload handling |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | ^9.0.2 | MIT | JWT authentication |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | ^2.4.3 | MIT | Password hashing |
| [cors](https://github.com/expressjs/cors) | ^2.8.5 | MIT | CORS middleware |
| [helmet](https://github.com/helmetjs/helmet) | ^8.0.0 | MIT | Security headers |
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | ^7.4.0 | MIT | Rate limiting |
| [archiver](https://github.com/archiverjs/node-archiver) | ^7.0.1 | MIT | ZIP file creation |
| [dotenv](https://github.com/motdotla/dotenv) | ^16.4.5 | BSD-2-Clause | Environment variables |
| [uuid](https://github.com/uuidjs/uuid) | ^10.0.0 | MIT | UUID generation |

## Development Tools

| Library | Version | License | Purpose |
|---------|---------|---------|---------|
| [typescript](https://github.com/microsoft/TypeScript) | ^5.5.0 | Apache-2.0 | TypeScript compiler |
| [tsx](https://github.com/privatenumber/tsx) | ^4.19.0 | MIT | TypeScript execution |
| [concurrently](https://github.com/open-cli-tools/concurrently) | ^9.0.1 | MIT | Run multiple commands |

---

## License Compliance Notes

- **No AGPL or GPL dependencies** are used in the production build.
- **No paid/proprietary PDF SDKs** are used (no Apryse, PSPDFKit, PDFTron, Foxit, Adobe).
- All dependencies are either MIT, Apache-2.0, ISC, or BSD-2-Clause licensed.
- This project can be used commercially without additional licensing fees for dependencies.
