// src/components/layout/AccordionMenu.jsx

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import styles from '../../css/mainlayout.module.css'; // Usamos el mismo CSS

/**
 * Componente para un item de menú desplegable (acordeón).
 */
export default function AccordionMenu({ item, handleLinkClick }) {
    const [isAccordionOpen, setIsAccordionOpen] = useState(false);

    // Al hacer clic en el botón principal del acordeón
    const toggleAccordion = (e) => {
        e.preventDefault(); // Evita la navegación
        setIsAccordionOpen(prev => !prev);
    };

    // Al hacer clic en un sub-enlace
    const onSubLinkClick = () => {
        // Cerramos el sidebar (mismo comportamiento que un link normal)
        handleLinkClick(); 
    };

    return (
        <div className={styles.accordionItem}>
            {/* Botón que abre/cierra el acordeón */}
            <a 
                href="#" 
                onClick={toggleAccordion} 
                className={`${styles.navLink} ${styles.accordionButton} ${isAccordionOpen ? styles.isOpen : ''}`}
            >
                <i className={item.icon}></i> 
                <span>{item.label}</span>
                {/* Icono de flecha que rota */}
                <i className={`fas fa-chevron-right ${styles.accordionIcon} ${isAccordionOpen ? styles.isOpen : ''}`}></i>
            </a>

            {/* Contenedor de los sub-enlaces */}
            <div className={`${styles.accordionContent} ${isAccordionOpen ? styles.isOpen : ''}`}>
                {item.links.map(subLink => (
                    <NavLink
                        key={subLink.to}
                        to={subLink.to}
                        onClick={onSubLinkClick}
                        // Usamos un estilo 'subLink'
                        className={({ isActive }) => `${styles.navLink} ${styles.subLink} ${isActive ? styles.activeLink : ''}`}
                    >
                        <i className={subLink.icon}></i> 
                        <span>{subLink.label}</span>
                    </NavLink>
                ))}
            </div>
        </div>
    );
}