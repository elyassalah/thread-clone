import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../../store";

interface SidebarState {
  isActive:boolean
}
const initialState : SidebarState = {
  isActive: false,
};

export const leftSideBarSlice = createSlice({
  name: "leftSidebar",
  initialState,
  reducers: {
    setIsActive: (
      state,
      actions: PayloadAction<{pathname:string , route:string}>,
    ) => {
      const { pathname, route } = actions.payload;
      state.isActive = ((pathname.includes(route) && route.length > 1)
        || pathname === route);
    },
  },
});
export const { setIsActive } = leftSideBarSlice.actions;
export default leftSideBarSlice.reducer;