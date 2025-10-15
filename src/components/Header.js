import Box from "@mui/material/Box";
import Image from "next/image";
import Typography from "@mui/material/Typography";
import React from "react";

export default function Header() {
    return (
        <Box
            sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                zIndex: 1, // Ensure the header is on top of the map
                p: 2, // Add some padding
                backgroundColor: 'rgba(26, 32, 44, 0.8)', // Semi-transparent dark background
                display: 'flex',
                alignItems: 'center',
                gap: 2,
            }}
        >
            <Image
                src="/saeon-logo.png" // Path to your logo in the public directory
                alt="Ocean Viewer Logo"
                height={50}
                width={100}
                priority // Use priority for logos to load them quickly
            />
            <Image
                src="/somisana-logo.png" // Path to your logo in the public directory
                alt="Ocean Viewer Logo"
                height={50}
                width={70}
                priority // Use priority for logos to load them quickly
            />
            <Typography variant="h4" component="h1" sx={{color: '#e2e8f0'}}>
                Ocean Data Viewer
            </Typography>
        </Box>
    )
}