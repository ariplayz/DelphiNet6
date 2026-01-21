interface SidebarProps {
    setScreen: (screen: string) => void;
}

function Sidebar({ setScreen }: SidebarProps) {
    return (
        <aside className="sidebar">
            <button onClick={() => setScreen('dashboard')}>Dashboard</button>
            <button onClick={() => setScreen('points')}>Points</button>
        </aside>
    );
}

export default Sidebar;