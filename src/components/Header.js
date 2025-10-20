import {Box, LinearProgress} from "@mui/material";
import Image from "next/image";
import Typography from "@mui/material/Typography";
import React from "react";

export default function Header() {
    return (
        <Box
            sx={{
                width: '100%',
                zIndex: 1,
                p: 2,
                backgroundColor: 'rgba(26, 32, 44, 0.8)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
            }}
        >
            <Image
                src="/saeon-logo.png"
                alt="Ocean Viewer Logo"
                height={50}
                width={100}
                priority
            />
            <Image
                src="/somisana-logo.png"
                alt="Ocean Viewer Logo"
                height={50}
                width={70}
                priority
            />
            <Typography variant="h4" component="h1" sx={{color: '#e2e8f0'}}>
                Ocean Data Viewer
            </Typography>            
        </Box>
    )
}