import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  function updateLocalStorage(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {}
  }

  async function getProductDetails(productId: number) {
    return await api.get<Stock>(`/stock/${productId}`).then((res) => res.data);
  }

  const addProduct = async (productId: number) => {
    try {
      const productStock = await getProductDetails(productId);

      const product = await api
        .get<Omit<Product, "amount">>(`/products/${productId}`)
        .then((res) => res.data);

      if (productStock.amount === 1) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const productCartIndex = cart.findIndex(
        (cartProduct) => cartProduct.id === product.id
      );

      if (productCartIndex === -1) {
        cart.push({ ...product, amount: 1 });
        setCart([...cart]);
        updateLocalStorage("@RocketShoes:cart", JSON.stringify(cart));
        return;
      }

      const updatedProduct = {
        ...cart[productCartIndex],
        amount: cart[productCartIndex].amount + 1,
      };

      cart[productCartIndex] = updatedProduct;

      setCart([...cart]);
      updateLocalStorage("@RocketShoes:cart", JSON.stringify(cart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const productCartIndex = cart.findIndex(
        (cartProduct) => cartProduct.id === productId
      );

      if (productCartIndex !== -1) {
        cart.splice(productCartIndex, 1);

        setCart([...cart]);
        updateLocalStorage("@RocketShoes:cart", JSON.stringify(cart));
        return;
      }
      throw new Error();
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const productStock = await getProductDetails(productId);

      if (!(productStock.amount > amount)) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const productCartIndex = cart.findIndex(
        (cartProduct) => cartProduct.id === productId
      );

      if (productCartIndex !== -1) {
        const updatedProduct = {
          ...cart[productCartIndex],
          amount: amount,
        };

        cart[productCartIndex] = updatedProduct;

        setCart([...cart]);
        updateLocalStorage("@RocketShoes:cart", JSON.stringify(cart));
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
