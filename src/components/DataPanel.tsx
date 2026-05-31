import { Dispatch, SetStateAction } from "react";
import ButtonBox from "./ButtonBox";
import IconBar from "./IconBar";

export default function DataPanel({ setRefreshKey }: { setRefreshKey: Dispatch<SetStateAction<number>> }) {
  return (
    <div style={{  height: '100vh', background: '#0d1931', overflowY: 'auto', minWidth: "280px", maxWidth: "480px", flex: "1"}}>
        <IconBar />
        <ButtonBox setRefreshKey={setRefreshKey} />

      {}
    </div>
  )
}