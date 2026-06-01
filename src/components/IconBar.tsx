export default function IconBar() {
  return (
    <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", borderBottom: "1px solid var(--border2)" }}>
        <img src="src/assets/roadsense-1024.png" style={{ width: "48px", height: "48px", marginRight: "13px"}} />
        <div style={{ display: "block", padding: "0px", margin: "0px" }}>
          <h3 style={{ margin: "0px"}}>RoadSense</h3>
          <p style={{ fontSize: "10px", color: "var(--text3)", margin: "0px"}}>Analiza vozne podlage</p>
        </div>
      {}
    </div>
  )
}