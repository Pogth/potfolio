// --- 0. Horizontal Scrolling ---
const scrollWrapper = document.getElementById('horizontal-scroll-wrapper');
if (scrollWrapper) {
    window.addEventListener('wheel', (e) => {
        // Only hijack on desktop where we have horizontal layout
        if (window.innerWidth >= 768) {
            // Check if we are hovering over an element that ACTUALLY needs vertical scrolling
            const path = e.composedPath();
            const isScrollable = path.some(el => {
                if (el === scrollWrapper || el === document.body || el === window || el === document) return false;
                if (el instanceof Element) {
                    const style = window.getComputedStyle(el);
                    const hasScrollableY = style.overflowY === 'auto' || style.overflowY === 'scroll';
                    
                    // Safely ignore subpixel rendering differences (e.g., 1-2px) that might mistakenly trigger scroll trap
                    if (hasScrollableY && el.scrollHeight > Math.ceil(el.clientHeight) + 5) {
                        // If they are at the top and scrolling up, or at the bottom and scrolling down, don't trap scroll
                        const isAtTop = el.scrollTop <= 0 && e.deltaY < 0;
                        const isAtBottom = Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight - 5 && e.deltaY > 0;
                        if (!isAtTop && !isAtBottom) {
                            return true;
                        }
                    }
                }
                return false;
            });
            
            if (!isScrollable) {
                // If there is vertical scrolling (mouse wheel or vertical trackpad swipe)
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    e.preventDefault();
                    
                    // Debounce to prevent rapid-fire scrolling (One wheel tick = One full page jump)
                    if (window.isPageScrolling) return;
                    window.isPageScrolling = true;
                    
                    // Calculate exactly how wide one section is right now
                    const isCollapsed = document.body.classList.contains('is-collapsed');
                    const sidebarWidthVar = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width').trim();
                    const actualSidebarWidth = isCollapsed ? 0 : parseInt(sidebarWidthVar.replace('px', '')) || 256;
                    const sectionWidth = window.innerWidth - actualSidebarWidth;
                    
                    // Smoothly jump exactly one page forward or backward
                    scrollWrapper.scrollBy({ 
                        left: e.deltaY > 0 ? sectionWidth : -sectionWidth, 
                        behavior: 'smooth' 
                    });
                    
                    // Lock scrolling until the smooth scroll animation finishes
                    setTimeout(() => {
                        window.isPageScrolling = false;
                    }, 380); // 380ms makes scroll input locks release faster for a snappy feel
                }
                // If it's a purely horizontal swipe (e.deltaX > e.deltaY), do not preventDefault!
                // The browser will natively scroll the container horizontally with its own trackpad momentum.
            }
        }
    }, { passive: false });
}

// --- 1. Custom Cursor ---
const cursor = document.getElementById('custom-cursor');

document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
});

// Expand cursor on hover elements
const hoverables = document.querySelectorAll('.hoverable, button, a');
hoverables.forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
});

// --- 2. Web Audio API Engine ---
let audioCtx;
function initAudio() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) {
        console.error("Audio init error:", e);
    }
}

// Global user interaction to resume audio automatically across ALL devices (including mobile touch)
['mousedown', 'touchstart', 'pointerdown', 'keydown', 'click'].forEach(evt => {
    document.addEventListener(evt, () => {
        if (!audioCtx) initAudio();
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }, { passive: true });
});

function playTick(isBoot = false) {
    if (!audioCtx) return;
    // Prevent boot sequence from queuing up hundreds of sounds if suspended
    if (isBoot && audioCtx.state === 'suspended') return;
    
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'triangle';
        // Raised minimum frequency to 100Hz so laptop speakers can actually physically play it!
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.05);
        
        // Strict setValue -> exponentialRamp ONLY to prevent browser engine bugs
        gain.gain.setValueAtTime(0.6, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.05);
    } catch (e) { console.error(e); }
}

function playClack() {
    if (!audioCtx) return;
    // Don't block clack if suspended; let the browser queue it for the instant the click unlocks it!
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.08); // raised floor
        
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.08);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.08);
    } catch (e) { console.error(e); }
}

function playSwoosh() {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    try {
        const bufferSize = Math.floor(audioCtx.sampleRate * 0.3); // MUST BE INTEGER
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            // Increased noise volume so it's clearly audible
            data[i] = (Math.random() * 2 - 1) * 0.8;
        }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, audioCtx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(1500, audioCtx.currentTime + 0.1);
        filter.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.3);
        
        const gain = audioCtx.createGain();
        // Pure exponential ramps to prevent linear ramp silent dropping
        gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        
        noise.start(audioCtx.currentTime);
    } catch (e) { console.error(e); }
}

// Attach audio events to normal UI elements
hoverables.forEach(el => {
    el.addEventListener('mouseenter', () => playTick(false));
    el.addEventListener('mousedown', playClack);
});

// --- Draggable Variables ---
const terminalTriggerEl = document.getElementById('terminal-trigger');
const terminalHeader = document.getElementById('terminal-header');
let isDragging = false, startX, startY, initialX = 0, initialY = 0, currentX = 0, currentY = 0;

// --- 3. Mac Terminal Boot Sequence & DVD Bounce ---
const bootScreen = document.getElementById('mac-boot-screen');
const bootOutput = document.getElementById('boot-terminal-output');
const mainContent = document.getElementById('horizontal-scroll-wrapper');

let dvdAnimationId;
let dvdSpeedX = 2; // Pixels per frame
let dvdSpeedY = 2;

function startDvdBounce() {
    if (!terminalTriggerEl) return;
    
    function animate() {
        if (isDragging) {
            dvdAnimationId = requestAnimationFrame(animate);
            return;
        }

        const rect = terminalTriggerEl.getBoundingClientRect();
        
        // Calculate bounds relative to the centered flex position
        // Boot screen is fixed inset-0, so it's window width/height
        const maxX = (window.innerWidth - rect.width) / 2;
        const maxY = (window.innerHeight - rect.height) / 2;
        
        currentX += dvdSpeedX;
        currentY += dvdSpeedY;
        
        if (currentX >= maxX) {
            currentX = maxX;
            dvdSpeedX = -Math.abs(dvdSpeedX);
        } else if (currentX <= -maxX) {
            currentX = -maxX;
            dvdSpeedX = Math.abs(dvdSpeedX);
        }
        
        if (currentY >= maxY) {
            currentY = maxY;
            dvdSpeedY = -Math.abs(dvdSpeedY);
        } else if (currentY <= -maxY) {
            currentY = -maxY;
            dvdSpeedY = Math.abs(dvdSpeedY);
        }
        
        initialX = currentX;
        initialY = currentY;
        
        terminalTriggerEl.style.transform = `translate(${currentX}px, ${currentY}px)`;
        
        dvdAnimationId = requestAnimationFrame(animate);
    }
    
    dvdAnimationId = requestAnimationFrame(animate);
}

function stopDvdBounce() {
    if (dvdAnimationId) {
        cancelAnimationFrame(dvdAnimationId);
    }
    // Snap back to center
    currentX = 0;
    currentY = 0;
    initialX = 0;
    initialY = 0;
    if (terminalTriggerEl) {
        terminalTriggerEl.style.transform = `translate(0px, 0px)`;
    }
}

window.addEventListener('load', () => {
    // Skip boot sequence if already completed in this session
    if (sessionStorage.getItem('bootComplete') === 'true') {
        initialLoadComplete = true;
        const bootScreen = document.getElementById('mac-boot-screen');
        const mainContent = document.getElementById('horizontal-scroll-wrapper');
        const sidebar = document.getElementById('sidebar');
        const collapseBtn = document.getElementById('sidebar-collapse-btn');
        
        if (bootScreen) bootScreen.style.display = 'none';
        document.body.classList.remove('h-screen', 'overflow-hidden');
        if (mainContent) {
            mainContent.classList.remove('opacity-0');
            mainContent.classList.add('opacity-100');
        }
        if (sidebar) {
            sidebar.classList.remove('opacity-0');
            sidebar.classList.add('opacity-100');
        }
        if (collapseBtn) {
            collapseBtn.classList.remove('opacity-0');
            collapseBtn.classList.add('opacity-100');
        }
        
        // Scroll to hash immediately on load if present
        if (window.location.hash) {
            const targetElement = document.querySelector(window.location.hash);
            if (targetElement) {
                targetElement.scrollIntoView();
            }
        }
        updateActiveSection();
        return;
    }

    // Start the DVD bounce animation!
    startDvdBounce();

    // Browsers block autoplay audio without interaction.
    try { initAudio(); } catch(e) {}
    
    const command = "sudo update parth's portfolio";
    const tw = document.getElementById('boot-typewriter');
    const cursorBlink = document.getElementById('boot-cursor');
    let i = 0;
    
    setTimeout(() => {
        const typingInterval = setInterval(() => {
            if (i < command.length) {
                tw.textContent += command.charAt(i);
                // Play sound every 3rd character (1/3 of keypresses) and skip spaces
                if (i % 3 === 0 && command.charAt(i) !== ' ') {
                    playTick(true);
                }
                i++;
            } else {
                clearInterval(typingInterval);
                
                setTimeout(() => {
                    playClack();
                    cursorBlink.style.display = 'none'; 
                    bootOutput.style.display = 'flex';
                    
                    bootOutput.innerHTML = `
                        <p class="text-gray-400">[INIT] KERNEL MOUNTED...</p>
                        <p class="text-gray-400">[SYS] REBUILDING ASSETS...</p>
                        <p class="text-green mt-2">[OK] Update successful. Systems online.</p>
                        <p class="mt-4"><span class="text-pink font-bold">guest@parth</span>:<span class="text-blue font-bold">~</span>$ <span class="animate-blink text-orange">_</span></p>
                    `;

                    setTimeout(() => {
                        // --- Morph Transition: Boot Terminal to Home Page Editor ---
                        if (dvdAnimationId) {
                            cancelAnimationFrame(dvdAnimationId);
                        }
                        isDragging = false;

                        // 1. Measure start and target positions
                        const startRect = terminalTriggerEl.getBoundingClientRect();
                        const targetEl = document.getElementById('code-editor-trigger');
                        const targetRect = targetEl ? targetEl.getBoundingClientRect() : null;

                        if (targetRect) {
                            // 2. Hide boot logs and show code editor UI inside the boot terminal
                            const terminalBodyEl = document.getElementById('boot-terminal-body');
                            const bootEditorEl = document.getElementById('boot-editor-view');
                            const terminalTitleEl = document.getElementById('boot-terminal-title');
                            
                            if (terminalBodyEl) terminalBodyEl.style.display = 'none';
                            if (bootEditorEl) {
                                bootEditorEl.style.display = 'flex';
                                bootEditorEl.classList.remove('hidden');
                            }
                            if (terminalTitleEl) {
                                terminalTitleEl.textContent = 'parth.ts';
                            }

                            // 3. Move terminal to body so it does not fade out with its parent overlay
                            document.body.appendChild(terminalTriggerEl);

                            // 4. Pin boot terminal to current viewport coordinates
                            terminalTriggerEl.style.position = 'fixed';
                            terminalTriggerEl.style.margin = '0';
                            terminalTriggerEl.style.transform = 'none';
                            terminalTriggerEl.style.left = startRect.left + 'px';
                            terminalTriggerEl.style.top = startRect.top + 'px';
                            terminalTriggerEl.style.width = startRect.width + 'px';
                            terminalTriggerEl.style.height = startRect.height + 'px';
                            terminalTriggerEl.style.zIndex = '1000';
                            terminalTriggerEl.style.willChange = 'left, top, width, height, border-radius';
                            
                            // Force reflow
                            terminalTriggerEl.offsetHeight;

                            // 5. Smoothly transition position, size, and border-radius to match target
                            terminalTriggerEl.style.transition = 'all 1.0s cubic-bezier(0.16, 1, 0.3, 1)';
                            terminalTriggerEl.style.left = targetRect.left + 'px';
                            terminalTriggerEl.style.top = targetRect.top + 'px';
                            terminalTriggerEl.style.width = targetRect.width + 'px';
                            terminalTriggerEl.style.height = targetRect.height + 'px';
                            terminalTriggerEl.style.borderRadius = '0px';

                            // Hide the real target temporarily so there's no layout flashing
                            targetEl.style.visibility = 'hidden';
                        }

                        // 6. Fade out the boot overlay backdrop
                        bootScreen.style.transition = 'opacity 1.0s cubic-bezier(0.16, 1, 0.3, 1)';
                        bootScreen.style.opacity = '0';

                        // 7. Animate main layout appearance
                        document.body.classList.remove('h-screen', 'overflow-hidden');
                        if (mainContent) {
                            mainContent.classList.remove('opacity-0');
                            mainContent.classList.add('opacity-100');
                        }
                        const sidebar = document.getElementById('sidebar');
                        if (sidebar) {
                            sidebar.classList.remove('opacity-0');
                            sidebar.classList.add('opacity-100');
                        }
                        const collapseBtn = document.getElementById('sidebar-collapse-btn');
                        if (collapseBtn) {
                            collapseBtn.classList.remove('opacity-0');
                            collapseBtn.classList.add('opacity-100');
                        }

                        // 8. Cleanup and reveal actual interactive homepage card
                        setTimeout(() => {
                            bootScreen.style.display = 'none';
                            if (targetEl) {
                                targetEl.style.visibility = 'visible';
                            }
                            
                            // Hide the boot terminal window and clean up styles
                            terminalTriggerEl.style.display = 'none';
                            terminalTriggerEl.style.position = '';
                            terminalTriggerEl.style.top = '';
                            terminalTriggerEl.style.left = '';
                            terminalTriggerEl.style.width = '';
                            terminalTriggerEl.style.height = '';
                            terminalTriggerEl.style.margin = '';
                            terminalTriggerEl.style.transform = '';
                            terminalTriggerEl.style.transition = '';
                            terminalTriggerEl.style.borderRadius = '';
                            terminalTriggerEl.style.willChange = '';
                            
                            // Mark boot complete in sessionStorage
                            sessionStorage.setItem('bootComplete', 'true');
                        }, 1000);
                    }, 1000); // Show boot output for 1000ms before starting morph
                }, 340); // Pause briefly after typing before showing boot output
            }
        }, 40); // Type extremely fast (40ms per character)
    }, 500); // Start typing very quickly (500ms)
});

// --- Draggable Terminal Window ---
if(terminalHeader) {
    terminalHeader.addEventListener('mousedown', (e) => {
        isDragging = true;
        terminalHeader.style.cursor = 'grabbing';
        startX = e.clientX;
        startY = e.clientY;
        document.body.classList.add('cursor-hover');
    });

    terminalHeader.addEventListener('touchstart', (e) => {
        isDragging = true;
        terminalHeader.style.cursor = 'grabbing';
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        document.body.classList.add('cursor-hover');
    }, { passive: true });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        currentX = initialX + dx;
        currentY = initialY + dy;
        terminalTriggerEl.style.transform = `translate(${currentX}px, ${currentY}px)`;
    });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        currentX = initialX + dx;
        currentY = initialY + dy;
        terminalTriggerEl.style.transform = `translate(${currentX}px, ${currentY}px)`;
    }, { passive: true });

    const stopDrag = () => {
        if (isDragging) {
            isDragging = false;
            terminalHeader.style.cursor = 'grab';
            initialX = currentX;
            initialY = currentY;
            document.body.classList.remove('cursor-hover');
        }
    };

    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag, { passive: true });
}

// --- Scroll Reveal Animation ---
const revealElements = document.querySelectorAll('.reveal');
const revealCallback = (entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');

            const counters = entry.target.querySelectorAll('.counter');
            counters.forEach(counter => {
                if (!counter.classList.contains('counted')) {
                    animateCounter(counter);
                    counter.classList.add('counted');
                }
            });
        }
    });
};

const revealObserver = new IntersectionObserver(revealCallback, {
    threshold: 0.1,
    rootMargin: "0px" // Default viewport triggering works best for translated elements
});

revealElements.forEach(el => revealObserver.observe(el));

// Counter Animation logic (with Decryption Scramble Effect)
function animateCounter(element) {
    const target = parseFloat(element.getAttribute('data-target'));
    const isDecimal = element.getAttribute('data-decimal') === 'true';
    const duration = 2000;
    const step = 30;
    let current = 0;
    const increment = target / (duration / step);
    
    const scrambleChars = "0123456789!@#$%^&*";

    const timer = setInterval(() => {
        current += increment;
        
        if (current >= target) {
            current = target;
            clearInterval(timer);
            if (isDecimal) {
                element.innerText = target.toFixed(1);
            } else {
                element.innerText = target + (target > 3 ? '+' : '');
            }
            return;
        }

        // Display scrambled version of the current number
        let displayStr = "";
        let currentStr = isDecimal ? current.toFixed(1) : Math.floor(current).toString();
        
        for (let i = 0; i < currentStr.length; i++) {
            if (currentStr[i] === '.') {
                displayStr += '.';
            } else {
                // 30% chance to show a scrambled character instead of the real one during counting
                if (Math.random() < 0.3) {
                    displayStr += scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
                } else {
                    displayStr += currentStr[i];
                }
            }
        }

        if (!isDecimal && target > 3) {
            displayStr += (Math.random() < 0.5 ? '+' : scrambleChars[Math.floor(Math.random() * scrambleChars.length)]);
        }
        
        element.innerText = displayStr;
        
    }, step);
}

// Copy Email Tooltip
function copyEmail() {
    const email = "parthsharmaro2@gmail.com";
    navigator.clipboard.writeText(email).then(() => {
        const tooltip = document.getElementById('email-tooltip');
        tooltip.classList.remove('opacity-0');
        tooltip.classList.add('opacity-100', '-translate-y-2');
        setTimeout(() => {
            tooltip.classList.add('opacity-0');
            tooltip.classList.remove('opacity-100', '-translate-y-2');
        }, 2000);
    });
}

// --- Sidebar Collapse ---
const collapseBtn = document.getElementById('sidebar-collapse-btn');
const sidebarArrow = document.getElementById('sidebar-arrow');
let isSidebarCollapsed = false;

if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
        const root = document.documentElement;
        if (!isSidebarCollapsed) {
            // Collapse
            root.style.setProperty('--sidebar-width', '80px');
            sidebarArrow.style.transform = 'rotate(180deg)';
            document.body.classList.add('is-collapsed');
            isSidebarCollapsed = true;
        } else {
            // Expand
            root.style.setProperty('--sidebar-width', '220px');
            sidebarArrow.style.transform = 'rotate(0deg)';
            document.body.classList.remove('is-collapsed');
            isSidebarCollapsed = false;
        }
    });
}

// --- 5. Logo Typing & Color Cycling ---
const logoTextEl = document.getElementById('logo-text');
const logoContainer = document.getElementById('logo-container');
if (logoTextEl && logoContainer) {
    const textToType = "PARTH";
    const colors = ['text-orange', 'text-pink', 'text-blue', 'text-green', 'text-yellow'];
    let colorIndex = 0;
    
    function typeLogo() {
        logoTextEl.textContent = "";
        let charIndex = 0;
        
        // Change color
        logoContainer.classList.remove(...colors);
        logoContainer.classList.add(colors[colorIndex]);
        colorIndex = (colorIndex + 1) % colors.length;
        
        const typeInterval = setInterval(() => {
            if (charIndex < textToType.length) {
                logoTextEl.textContent += textToType.charAt(charIndex);
                charIndex++;
            } else {
                clearInterval(typeInterval);
                // Wait a few seconds, then delete and re-type
                setTimeout(() => {
                    const deleteInterval = setInterval(() => {
                        if (logoTextEl.textContent.length > 0) {
                            logoTextEl.textContent = logoTextEl.textContent.slice(0, -1);
                        } else {
                            clearInterval(deleteInterval);
                            setTimeout(typeLogo, 500); // Wait 0.5s before typing next
                        }
                    }, 50); // fast delete
                }, 4000); // stay visible for 4s
            }
        }, 150); // type speed
    }
    
    // Start after boot sequence
    setTimeout(typeLogo, 3000);
}

// --- Section Scroll Sound (Swoosh) & Navigation Highlight ---
let initialLoadComplete = false;
setTimeout(() => { 
    initialLoadComplete = true; 
    
    // If there's a hash in the URL on load, scroll to that section
    if (window.location.hash) {
        const targetElement = document.querySelector(window.location.hash);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    updateActiveSection(); // Run once after initial reveal animations finish
}, 3500); // Wait for boot and reveal

const navLinks = document.querySelectorAll('.nav-link');

function updateActiveSection() {
    const sections = document.querySelectorAll('.horizontal-section');
    if (sections.length === 0) return;
    
    let activeSection = null;
    
    if (window.innerWidth >= 768) {
        // Desktop horizontal scrolling
        const isCollapsed = document.body.classList.contains('is-collapsed');
        const sidebarWidthVar = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width').trim();
        const sidebarWidth = isCollapsed ? 80 : (parseInt(sidebarWidthVar) || 220);
        
        const viewportWidth = window.innerWidth;
        // The active area is the space to the right of the sidebar: [sidebarWidth, viewportWidth]
        const activeCenter = sidebarWidth + (viewportWidth - sidebarWidth) / 2;
        
        let minDistance = Infinity;
        
        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            const sectionCenter = rect.left + rect.width / 2;
            const distance = Math.abs(sectionCenter - activeCenter);
            if (distance < minDistance) {
                minDistance = distance;
                activeSection = section;
            }
        });
    } else {
        // Mobile vertical scrolling
        const activeCenter = window.innerHeight / 2;
        
        let minDistance = Infinity;
        
        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            const sectionCenter = rect.top + rect.height / 2;
            const distance = Math.abs(sectionCenter - activeCenter);
            if (distance < minDistance) {
                minDistance = distance;
                activeSection = section;
            }
        });
    }
    
    if (activeSection) {
        const id = activeSection.getAttribute('id');
        if (id) {
            const currentActiveLink = document.querySelector('.nav-link.active-nav-link');
            const targetHref = `#${id}`;
            
            if (!currentActiveLink || currentActiveLink.getAttribute('href') !== targetHref) {
                navLinks.forEach(link => {
                    link.classList.remove('active-nav-link');
                    if (link.getAttribute('href') === targetHref) {
                        link.classList.add('active-nav-link');
                    }
                });
                
                if (initialLoadComplete) {
                    playSwoosh();
                }
            }
        }
    }
}

// Attach listeners for scroll, resize, pageshow (history.back), and hashchange
if (scrollWrapper) {
    scrollWrapper.addEventListener('scroll', updateActiveSection, { passive: true });
}
window.addEventListener('resize', updateActiveSection, { passive: true });
window.addEventListener('pageshow', updateActiveSection);
window.addEventListener('hashchange', updateActiveSection);

// Intercept clicks on nav links and logo to ensure scrolling works even if hash is unchanged
const clickableLinks = document.querySelectorAll('.nav-link, #logo-container');
clickableLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        const targetId = link.getAttribute('href');
        if (targetId && targetId.startsWith('#')) {
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({ behavior: 'smooth' });
                history.pushState(null, null, targetId);
                updateActiveSection();
            }
        }
    });
});

// Run initial check
updateActiveSection();

// --- 6. Code Editor Tab Switching ---
const editorCode = document.getElementById('editor-code-content');
const editorLines = document.getElementById('editor-line-numbers');
const editorActiveTitle = document.getElementById('editor-active-file-title');
const codeTabs = document.querySelectorAll('.code-tab');

const fileContents = {
    'parth.ts': {
        language: 'TypeScript',
        lines: 7,
        code: `<span class="text-pink">export</span> <span class="text-pink">const</span> <span class="text-blue">developer</span> = {
    name: <span class="text-green">"Parth Sharma"</span>,
    role: <span class="text-green">"AI/ML & Full-Stack Developer"</span>,
    focus: [<span class="text-orange">"deep_learning"</span>, <span class="text-orange">"fullstack"</span>],
    available: <span class="text-blue">true</span>
};`
    },
    'skills.md': {
        language: 'Markdown',
        lines: 6,
        code: `<span class="text-pink"># Core Capabilities</span>

<span class="text-orange">*</span> <span class="text-blue">AI/ML</span>: PyTorch, TensorFlow, OpenCV
<span class="text-orange">*</span> <span class="text-blue">Web</span>: ReactJS, NodeJS, Tailwind
<span class="text-orange">*</span> <span class="text-blue">Data</span>: MongoDB, NumPy, REST APIs
<span class="text-orange">*</span> <span class="text-blue">Ops</span>: Docker, Git, Linux/Bash`
    },
    'research.md': {
        language: 'Markdown',
        lines: 6,
        code: `<span class="text-pink"># Research Publication</span>

<span class="text-orange">*</span> Title: <span class="text-green">"Automated Skin Disease Detection"</span>
<span class="text-orange">*</span> Venue: <span class="text-blue">ICAISS 2025</span> (Amity Univ)
<span class="text-orange">*</span> Metrics: <span class="text-blue">89% Accuracy, 99% recall</span>`
    }
};

if (codeTabs.length > 0 && editorCode && editorLines && editorActiveTitle) {
    codeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const file = tab.getAttribute('data-file');
            if (!fileContents[file]) return;
            
            // Audio feedback
            if (typeof playClack === 'function') {
                playClack();
            } else if (typeof playTick === 'function') {
                playTick(false);
            }
            
            // Update active states on tabs
            codeTabs.forEach(t => {
                t.classList.remove('active');
            });
            tab.classList.add('active');
            
            // Update Title
            editorActiveTitle.textContent = file;
            
            // Update Line Numbers
            const lineCount = fileContents[file].lines;
            let lineHTML = '';
            for (let i = 1; i <= lineCount; i++) {
                lineHTML += `<span>${i}</span>`;
            }
            editorLines.innerHTML = lineHTML;
            
            // Update Code Content
            editorCode.innerHTML = `<code class="language-${fileContents[file].language.toLowerCase()}">${fileContents[file].code}</code>`;
        });
    });
}

// --- 7. Tilt Card 3D Hover Effect ---
const tiltCards = document.querySelectorAll('.tilt-card');
if (window.matchMedia('(hover: hover)').matches) {
    tiltCards.forEach(card => {
        // Initial transition for snappy return
        card.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s';
        
        card.addEventListener('mousemove', (e) => {
            // Reduce transition for responsive mouse tracking
            card.style.transition = 'transform 0.1s ease, box-shadow 0.2s';
            
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Calculate tilt amounts (max 8 degrees)
            const tiltX = ((y - centerY) / centerY) * -8; 
            const tiltY = ((x - centerX) / centerX) * 8;
            
            card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.25, 1.25, 1.25)`;
        });
        
        card.addEventListener('mouseleave', () => {
            // Restore smooth transition for return to rest
            card.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s';
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        });
    });
}

// --- 8. Flipbook Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    const bookEl = document.getElementById('research-book');
    if (bookEl && typeof St !== 'undefined' && St.PageFlip) {
        const isMobileSize = window.innerWidth < 768;
        const minW = isMobileSize ? Math.min(280, window.innerWidth - 90) : 315;
        const minH = isMobileSize ? 380 : 420;

        const pageFlip = new St.PageFlip(bookEl, {
            width: 500, // base page width
            height: 700, // base page height
            size: "stretch",
            minWidth: minW,
            maxWidth: 600,
            minHeight: minH,
            maxHeight: 800,
            maxShadowOpacity: 0.5,
            showCover: true,
            mobileScrollSupport: false, // disable scrolling on flip book
            usePortrait: true // fallback to portrait mode on narrow screens (1 page)
        });

        const pages = document.querySelectorAll('.flip-book .page');
        pageFlip.loadFromHTML(pages);

        // Controls
        const btnPrev = document.getElementById('btn-prev');
        const btnNext = document.getElementById('btn-next');
        const pageCurrent = document.getElementById('page-current');
        const pageTotal = document.getElementById('page-total');

        if (btnPrev) {
            btnPrev.addEventListener('click', () => {
                pageFlip.flipPrev();
            });
        }
        if (btnNext) {
            btnNext.addEventListener('click', () => {
                pageFlip.flipNext();
            });
        }

        pageFlip.on('flip', (e) => {
            // Update page number
            if (pageCurrent) {
                pageCurrent.textContent = e.data + 1;
            }
            
            // Center the book when closed (on first or last page)
            const orientation = pageFlip.getOrientation();
            const totalPages = pageFlip.getPageCount();
            if (orientation === 'landscape') {
                if (e.data === 0) {
                    // Closed on front cover
                    bookEl.style.transform = 'translateX(-25%)';
                } else if (e.data === totalPages - 1) {
                    // Closed on back cover
                    bookEl.style.transform = 'translateX(25%)';
                } else {
                    // Open (2-page spread)
                    bookEl.style.transform = 'translateX(0)';
                }
            } else {
                // Portrait mode: keep centered
                bookEl.style.transform = 'translateX(0)';
            }
        });

        // Initialize centering state on load
        setTimeout(() => {
            const orientation = pageFlip.getOrientation();
            if (orientation === 'landscape') {
                bookEl.style.transform = 'translateX(-25%)';
            } else {
                bookEl.style.transform = 'translateX(0)';
            }
        }, 100);

        // Set total pages
        if (pageTotal) {
            pageTotal.textContent = pageFlip.getPageCount();
        }
    }
});
