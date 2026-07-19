import { createTheme } from "@mui/material/styles";

import palette from "./palette";
import typography from "./typography";
import shadows from "./shadows";

const theme = createTheme({
    palette,
    typography,
    shadows,

    shape: {
        borderRadius: 12,
    },

    spacing: 8,

    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    margin: 0,
                    padding: 0,
                    background: "#F8FAFC",
                    color: "#0F172A",
                    fontFamily: typography.fontFamily,
                    WebkitFontSmoothing: "antialiased",
                    MozOsxFontSmoothing: "grayscale",
                },

                "*": {
                    boxSizing: "border-box",
                },

                a: {
                    textDecoration: "none",
                    color: "inherit",
                },

                "#root": {
                    minHeight: "100vh",
                },
            },
        },


        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 14,
                    backgroundColor: "#FFFFFF",
                    backgroundImage: "none",
                    border: "1px solid rgba(226,232,240,.8)",
                    boxShadow: shadows[3],
                },
            },
        },


        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 14,
                    border:
                        "1px solid rgba(226,232,240,.8)",

                    background:
                        "rgba(255,255,255,.95)",

                    backdropFilter:
                        "blur(10px)",

                    boxShadow:
                        shadows[3],

                    transition:
                        "all .2s ease",
                },
            },
        },


        MuiButton: {
            defaultProps: {
                disableElevation: true,
            },

            styleOverrides: {
                root: {
                    borderRadius: 10,

                    height: 42,

                    paddingLeft: 18,
                    paddingRight: 18,

                    fontWeight: 600,

                    textTransform:
                        "none",

                    transition:
                        ".2s",
                },


                containedPrimary: {
                    background:
                        "linear-gradient(135deg,#2563EB,#7C3AED)",

                    "&:hover": {
                        background:
                            "linear-gradient(135deg,#1D4ED8,#6D28D9)",
                    },
                },


                outlined: {
                    borderWidth: 1,
                },
            },
        },


        MuiTextField: {
            defaultProps: {
                variant:
                    "outlined",

                fullWidth:
                    true,
            },
        },


        MuiOutlinedInput: {
            styleOverrides: {
                root: {

                    borderRadius:
                        10,

                    background:
                        "#FFFFFF",


                    "& input": {
                        padding:
                            "12px 14px",
                    },


                    "& fieldset": {
                        borderColor:
                            "#CBD5E1",
                    },


                    "&:hover fieldset": {
                        borderColor:
                            "#2563EB",
                    },


                    "&.Mui-focused fieldset": {
                        borderWidth:
                            2,

                        borderColor:
                            "#2563EB",
                    },
                },
            },
        },


        MuiAppBar: {
            styleOverrides: {
                root: {
                    background:
                        "rgba(255,255,255,.85)",

                    color:
                        "#0F172A",

                    backdropFilter:
                        "blur(14px)",

                    boxShadow:
                        shadows[2],
                },
            },
        },


        MuiDrawer: {
            styleOverrides: {
                paper: {
                    border:
                        "none",

                    background:
                        "#FFFFFF",

                    boxShadow:
                        shadows[4],
                },
            },
        },


        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius:
                        8,

                    height:
                        30,

                    fontWeight:
                        600,
                },
            },
        },


        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius:
                        14,

                    padding:
                        4,

                    boxShadow:
                        shadows[6],
                },
            },
        },


        MuiDivider: {
            styleOverrides: {
                root: {
                    borderColor:
                        "#E2E8F0",
                },
            },
        },


        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    borderRadius:
                        8,

                    fontSize:
                        13,
                },
            },
        },


        MuiLinearProgress: {
            styleOverrides: {
                root: {
                    height:
                        6,

                    borderRadius:
                        6,
                },
            },
        },


        MuiAvatar: {
            styleOverrides: {
                root: {
                    borderRadius:
                        10,
                },
            },
        },
    },
});


export default theme;