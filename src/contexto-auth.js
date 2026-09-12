import { createContext, useContext } from "react";

// El contexto y su hook viven aparte del componente proveedor: un archivo que
// exporta componentes y no-componentes a la vez rompe el fast refresh de Vite.
export const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);
