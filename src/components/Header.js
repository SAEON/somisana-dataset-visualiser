import { Box, Button, Menu, MenuItem, Typography } from "@mui/material";
import Image from "next/image";
import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { beautifyModelName } from "../utils/mapUtils";

export default function Header({ products, datasetId, productTitle }) {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleClick = (event) => {
        if (anchorEl) {
            setAnchorEl(null);
        } else {
            setAnchorEl(event.currentTarget);
        }
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleModelSelect = (id, productTitle) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('dataset_id', id);
        params.set('product_title', productTitle);
        router.push(`?${params.toString()}`);
        handleClose();
    };

    const currentDatasetTitle = React.useMemo(() => {
        if (!products || !productTitle || !datasetId) return beautifyModelName(datasetId);
        const product = products.find(p => p.title === productTitle);
        if (!product) return beautifyModelName(datasetId);
        const dataset = product.datasets.find(d => d.id === datasetId);
        return dataset && dataset.title ? dataset.title : beautifyModelName(datasetId);
    }, [products, productTitle, datasetId]);

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
            <Box
                onClick={() => router.push('/')}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    cursor: 'pointer',
                    '&:hover': { opacity: 0.8 }
                }}
            >
                <Image
                    src="/ocean_model_viewer/saeon-logo.png"
                    alt="SAEON Logo"
                    height={50}
                    width={100}
                    priority
                    unoptimized
                />
                <Image
                    src="/ocean_model_viewer/somisana-logo.png"
                    alt="SOMISANA Logo"
                    height={50}
                    width={70}
                    priority
                    unoptimized
                />
            </Box>

            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                <Typography variant="h4" component="h1" sx={{ color: '#e2e8f0', flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                    {productTitle && datasetId ? (
                        <>
                            {beautifyModelName(productTitle)}
                            <Box component="span" sx={{ mx: 3 }}>-</Box>
                            {currentDatasetTitle}
                        </>
                    ) : (
                        currentDatasetTitle
                    )}
                </Typography>

                <Button
                    variant="outlined"
                    onClick={() => router.push('/')}
                    sx={{
                        color: '#e2e8f0',
                        ml: 2,
                        mr: !productTitle ? '150px' : 0,
                        textTransform: 'none',
                        borderColor: 'rgba(226, 232, 240, 0.3)',
                        '&:hover': {
                            borderColor: '#e2e8f0',
                            backgroundColor: 'rgba(226, 232, 240, 0.1)'
                        }
                    }}
                >
                    Home
                </Button>

                {productTitle && (
                    <>
                        <Button
                            id="model-select-button"
                            aria-controls={open ? 'model-select-menu' : undefined}
                            aria-haspopup="true"
                            aria-expanded={open ? 'true' : undefined}
                            variant="outlined"
                            onClick={handleClick}
                            endIcon={<KeyboardArrowDownIcon />}
                            sx={{
                                color: '#e2e8f0',
                                ml: 2,
                                mr: '150px',
                                textTransform: 'none',
                                borderColor: 'rgba(226, 232, 240, 0.3)',
                                '&:hover': {
                                    borderColor: '#e2e8f0',
                                    backgroundColor: 'rgba(226, 232, 240, 0.1)'
                                }
                            }}
                        >
                            Members
                        </Button>
                        <Menu
                            id="model-select-menu"
                            anchorEl={anchorEl}
                            open={open}
                            onClose={handleClose}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            MenuListProps={{
                                'aria-labelledby': 'model-select-button',
                            }}
                            PaperProps={{
                                sx: {
                                    marginTop: '16px',
                                    backgroundColor: '#1a202c !important', // Force solid background
                                    backgroundImage: 'none !important',
                                    opacity: '1 !important',
                                    color: '#e2e8f0',
                                    border: '1px solid rgba(226, 232, 240, 0.2)',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.7)',
                                    zIndex: 2000
                                }
                            }}
                        >
                            {products && products
                                .filter(p => p.title === productTitle)
                                .flatMap(p => p.datasets.map(d => ({ id: d.id, title: d.title, productTitle: p.title })))
                                .map((d) => (
                                <MenuItem
                                    key={d.id}
                                    onClick={() => handleModelSelect(d.id, d.productTitle)}
                                    selected={d.id === datasetId}
                                >
                                    {d.title || beautifyModelName(d.id)}
                                </MenuItem>
                            ))}
                        </Menu>
                    </>
                )}
            </Box>
        </Box>
    )
}