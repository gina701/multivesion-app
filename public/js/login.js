const loginForm=document.getElementById("form"),loginError=document.getElementById("error");
loginForm.addEventListener("submit",async event=>{
  event.preventDefault();
  loginError.textContent="";
  try{
    const response=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:document.getElementById("username").value,password:document.getElementById("password").value})});
    const data=await response.json();
    if(!response.ok)throw Error(data.error||"Sign in failed");
    localStorage.setItem("multivision_token",data.token);
    location.href="dashboard.html";
  }catch(error){loginError.textContent=error.message}
});
