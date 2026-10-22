const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config();

const mongoose = require("mongoose");
const Product = require("./models/Product");

const products = [
  {
    name: "Lenovo IdeaPad 3 15ITL6",
    description: "Portátil liviano y eficiente para estudio y trabajo con pantalla Full HD.",
    price: 1850000,
    category: "portatiles",
    brand: "Lenovo",
    stock: 15,
    image: "https://placehold.co/600x400?text=Lenovo+IdeaPad+3",
    specs: {
      pantalla: "15.6 pulgadas FHD (1920x1080)",
      procesador: "Intel Core i5-1135G7",
      ram: "8GB DDR4 3200MHz",
      almacenamiento: "512GB SSD M.2 NVMe",
      graficos: "Intel Iris Xe Graphics"
    },
    featured: false
  },
  {
    name: "ASUS TUF Gaming F15",
    description: "Portátil gaming de alto rendimiento con gráficos dedicados y refrigeración avanzada.",
    price: 3890000,
    category: "portatiles",
    brand: "ASUS",
    stock: 8,
    image: "https://placehold.co/600x400?text=ASUS+TUF+Gaming+F15",
    specs: {
      pantalla: "15.6 pulgadas FHD 144Hz",
      procesador: "Intel Core i5-11400H",
      tarjeta_grafica: "NVIDIA GeForce RTX 3050 4GB",
      ram: "16GB DDR4 3200MHz",
      almacenamiento: "512GB SSD NVMe PCIe"
    },
    featured: true
  },
  {
    name: "AMD Ryzen 5 5600",
    description: "Procesador de 6 núcleos y 12 hilos con arquitectura Zen 3 ideal para juegos y productividad.",
    price: 620000,
    category: "procesadores",
    brand: "AMD",
    stock: 20,
    image: "https://placehold.co/600x400?text=AMD+Ryzen+5+5600",
    specs: {
      nucleos: "6",
      hilos: "12",
      frecuencia_base: "3.5 GHz",
      frecuencia_turbo: "4.4 GHz",
      socket: "AM4",
      cache: "32MB L3"
    },
    featured: false
  },
  {
    name: "Gigabyte GeForce RTX 4060 EAGLE OC 8GB",
    description: "Tarjeta gráfica con arquitectura NVIDIA Ada Lovelace, DLSS 3 y Ray Tracing de tercera generación.",
    price: 1690000,
    category: "tarjetas-graficas",
    brand: "NVIDIA",
    stock: 10,
    image: "https://placehold.co/600x400?text=RTX+4060+8GB",
    specs: {
      memoria: "8GB GDDR6",
      interfaz_memoria: "128-bit",
      refrigeracion: "Windforce 3X con ventiladores alternos",
      salidas: "2x HDMI 2.1a, 2x DisplayPort 1.4a",
      consumo: "115W"
    },
    featured: true
  },
  {
    name: "Kingston FURY Beast DDR4 16GB (2x8GB) 3200MHz",
    description: "Memoria RAM de alto rendimiento con disipador de calor de bajo perfil y soporte Intel XMP.",
    price: 195000,
    category: "memoria-ram",
    brand: "Kingston",
    stock: 35,
    image: "https://placehold.co/600x400?text=Kingston+Fury+16GB+DDR4",
    specs: {
      capacidad: "16GB (Kit 2x8GB)",
      tipo: "DDR4",
      velocidad: "3200 MHz",
      latencia: "CL16",
      voltaje: "1.35V"
    },
    featured: false
  },
  {
    name: "Samsung 980 NVMe M.2 SSD 1TB",
    description: "Unidad de estado sólido PCIe 3.0 de alta velocidad con tecnología HMB y optimización térmica.",
    price: 390000,
    category: "almacenamiento",
    brand: "Samsung",
    stock: 25,
    image: "https://placehold.co/600x400?text=Samsung+980+1TB",
    specs: {
      capacidad: "1TB",
      factor_forma: "M.2 2280",
      interfaz: "PCIe Gen 3.0 x4, NVMe 1.4",
      lectura_secuencial: "Hasta 3500 MB/s",
      escritura_secuencial: "Hasta 3000 MB/s"
    },
    featured: false
  },
  {
    name: "LG UltraGear 24GN600-B 24\" 144Hz",
    description: "Monitor gamer IPS con resolución Full HD, 1ms MBR y tecnología AMD FreeSync Premium.",
    price: 720000,
    category: "monitores",
    brand: "LG",
    stock: 12,
    image: "https://placehold.co/600x400?text=LG+UltraGear+24+144Hz",
    specs: {
      tamano: "23.8 pulgadas",
      resolucion: "1920x1080 FHD",
      tasa_refresco: "144 Hz",
      tiempo_respuesta: "1ms (GtG)",
      panel: "IPS con HDR10"
    },
    featured: true
  },
  {
    name: "Teclado Mecánico Redragon Kumara K552",
    description: "Teclado mecánico compacto TKL con switches resistentes al polvo y retroiluminación RGB.",
    price: 165000,
    category: "perifericos",
    brand: "Redragon",
    stock: 30,
    image: "https://placehold.co/600x400?text=Redragon+Kumara",
    specs: {
      tipo_teclado: "Mecánico",
      switches: "Outemu Red",
      formato: "Tenkeyless (87 teclas)",
      iluminacion: "RGB Chroma configurable",
      conexion: "Cable USB enmallado"
    },
    featured: false
  },
  {
    name: "Mouse Gamer Logitech G203 Lightsync",
    description: "Mouse gamer clásico con sensor de alta precisión hasta 8000 DPI e iluminación RGB Lightsync.",
    price: 95000,
    category: "perifericos",
    brand: "Logitech",
    stock: 40,
    image: "https://placehold.co/600x400?text=Logitech+G203",
    specs: {
      sensor: "Óptico 8000 DPI",
      botones: "6 botones programables",
      iluminacion: "RGB Lightsync",
      peso: "85 gramos",
      conexion: "USB"
    },
    featured: false
  }
];

const seedProducts = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error("Error: MONGODB_URI no está definido en el archivo .env");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB conectado para seed");

    await Product.deleteMany({});
    console.log("Productos existentes eliminados");

    await Product.insertMany(products);
    console.log("9 productos insertados");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error en seed:", error);
    process.exit(1);
  }
};

seedProducts();
