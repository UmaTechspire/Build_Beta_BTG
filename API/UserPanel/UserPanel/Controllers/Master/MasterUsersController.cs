using Application.Master.Users.GetAllSalesPerson;
using Core.Models;
using DocumentFormat.OpenXml.Spreadsheet;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using UserPanel.Application.OrderMngMaster.Master.UpdatePassword;
using UserPanel.Application.OrderMngMaster.Master.Users;
using UserPanel.Application.ProductionOrder.UpdateProductionOrder;
using UserPanel.Auth;

namespace UserPanel.Controllers.Master
{
    [Route("api/[controller]")]
    [ApiController]
    public class MasterUsersController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly IMediator _mediator;
        private readonly IConfiguration _configuration;
        private readonly ApplicationDbContext _dbContext;

        public MasterUsersController(IMediator mediator, IConfiguration configuration, UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager, ApplicationDbContext dbContext)
        {
            _mediator = mediator;
            _configuration = configuration;
            _userManager = userManager;
            _roleManager = roleManager;
            _dbContext = dbContext;
        }

        //#region Sales Person Retrieval

        //[HttpGet("GetALLSalesPerson")]
        //public async Task<IActionResult> GetALLSalesPerson()
        //{
        //    var result = await _mediator.Send(new GetAllSalesPersonQuery());
        //    return Ok(result);
        //}

        //#endregion

        #region User Creation

        /// <summary>
        /// Creates a new user.
        /// </summary>
        /// <param name="command">The command containing user creation details.</param>
        [HttpPost("create-update")]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserCommand createUser)
        {
            if (createUser == null)
            {
                return BadRequest("User creation data is required.");
            }

            var result = await _mediator.Send(createUser);
            if (result is ResponseModel response)
            {
                if (response.StatusCode == 200)
                {
                    //var userExists = await _userManager.FindByNameAsync(createUser.UserName);
                    var userExists = await _userManager.FindByIdAsync(createUser.userid);
                    if (createUser.Id > 0 )
                    {

                        userExists.Email = createUser.EmailID;
                        userExists.PhoneNumber = createUser.MobileNo;
                        userExists.UserName = createUser.UserName;
                        userExists.UserId = (int)createUser.Id;

                        var updateResult = await _userManager.UpdateAsync(userExists);

                        var hasPassword = await _userManager.HasPasswordAsync(userExists);
                        if (hasPassword)
                        {
                            var removeResult = await _userManager.RemovePasswordAsync(userExists);
                           
                        }

                        // Add new password
                        var pwd_result = await _userManager.AddPasswordAsync(userExists, createUser.Password);

                        var existingUserRoles = _dbContext.UserRoles.Where(ur => ur.UserId == userExists.Id).ToList();
                        if (existingUserRoles.Any())
                        {
                            _dbContext.UserRoles.RemoveRange(existingUserRoles);
                        }

                        var normalizedRoleName = createUser.RoleName.ToUpper();
                        var role = _dbContext.Roles.FirstOrDefault(r => r.NormalizedName == normalizedRoleName);
                        bool roleAssigned = false;
                        if (role != null)
                        {
                            _dbContext.UserRoles.Add(new IdentityUserRole<string> { UserId = userExists.Id, RoleId = role.Id });
                            roleAssigned = true;
                        }
                        
                        await _dbContext.SaveChangesAsync();
                        var roleInsert = roleAssigned ? IdentityResult.Success : IdentityResult.Failed(new IdentityError { Description = "Role not found." });

                        if (!updateResult.Succeeded && !roleInsert.Succeeded)
                        {
                            return StatusCode(StatusCodes.Status500InternalServerError, new Response
                            {
                                Status = "Error",
                                Message = "User creation failed! Please check user details and try again."
                            });
                        }
                    }
                    else
                    {
                        ApplicationUser user = new ApplicationUser
                        {
                            Email = createUser.EmailID,
                            PhoneNumber = createUser.MobileNo,
                            SecurityStamp = Guid.NewGuid().ToString(),
                            UserName = createUser.UserName,
                            UserId= (int)response.Data
                        };

                        var createResult = await _userManager.CreateAsync(user, createUser.Password);
                        
                        var normalizedRoleName = createUser.RoleName.ToUpper();
                        var role = _dbContext.Roles.FirstOrDefault(r => r.NormalizedName == normalizedRoleName);
                        bool roleAssigned = false;
                        if (role != null)
                        {
                            _dbContext.UserRoles.Add(new IdentityUserRole<string> { UserId = user.Id, RoleId = role.Id });
                            await _dbContext.SaveChangesAsync();
                            roleAssigned = true;
                        }

                        var roleInsert = roleAssigned ? IdentityResult.Success : IdentityResult.Failed(new IdentityError { Description = "Role not found." });


                        if (!createResult.Succeeded && !roleInsert.Succeeded)
                        {
                            return StatusCode(StatusCodes.Status500InternalServerError, new Response
                            {
                                Status = "Error",
                                Message = "User creation failed! Please check user details and try again."
                            });
                        }
                    }
                    return Ok(result);
                }
                else
                {

                    return Ok(result);
                }
            }
            else
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new Response
                {
                    Status = "Error",
                    Message = "Unexpected response format."
                });
            }


        }



        #endregion



        #region update Password

        /// <summary>
        /// Creates a new user.
        /// </summary>
        /// <param name="command">The command containing user creation details.</param>
        [HttpPost("update-password")]
        public async Task<IActionResult> Updatepassword([FromBody] UpdatePasswordUserCommand createUser)
        {
            if (createUser == null)
            {
                return BadRequest("User creation data is required.");
            }

            var result = await _mediator.Send(createUser);
            if (result is ResponseModel response)
            {
                if (response.StatusCode == 200)
                {
                    //var userExists = await _userManager.FindByNameAsync(createUser.UserName);
                    var userExists = await _userManager.FindByIdAsync(createUser.userid);
                    if (createUser.Id > 0)
                    {

                       

                        var hasPassword = await _userManager.HasPasswordAsync(userExists);
                        if (hasPassword)
                        {
                            var removeResult = await _userManager.RemovePasswordAsync(userExists);

                        }

                        // Add new password
                        var pwd_result = await _userManager.AddPasswordAsync(userExists, createUser.Password);

                        var userRoles = await _userManager.GetRolesAsync(userExists);

                      
                         
                    }
                    
                    return Ok(result);
                }
                else
                {

                    return Ok(result);
                }
            }
            else
            {

                return Ok(new ResponseModel
                {
                    Data = null,
                    Message = "Password update failed",
                    Status = false,
                    StatusCode = 400
                });
               
            }


        }



        #endregion

        #region User Retrieval

        /// <summary>
        /// Retrieves a list of users based on search criteria.
        /// </summary>
        /// <param name="userName">Optional name to filter users by name.</param>
        /// <param name="fromDate">Optional start date for user creation range.</param>
        /// <param name="toDate">Optional end date for user creation range.</param>
        [HttpGet("getlist")]
        public async Task<IActionResult> GetAllUsers(int ProdId, string FromDate, string ToDate, Int32 BranchId, string? UserName)
        {

            var result = await _mediator.Send(new GetAllUserQuery() { ProdId = ProdId, FromDate = FromDate, ToDate = ToDate, BranchId = BranchId, Username = UserName });
            return Ok(result);
        }
        #endregion

        #region GetUserById
        /// <summary>
        /// Retrieves a specific user by their ID.
        /// </summary>
        /// <param name="userID">The unique identifier of the user.</param>
        [HttpGet("getbyId")]
        public async Task<IActionResult> GetUserById(int userID, int branchId)
        {
            if (userID <= 0)
            {
                return BadRequest("Invalid user ID.");
            }

            var query = new GetUserByIdQuery { UserId = userID, BranchId = branchId };
            var result = await _mediator.Send(query);
            return Ok(result);
        }

        #endregion

        //#region User Update

        ///// <summary>
        ///// Updates the details of an existing user.
        ///// </summary>
        ///// <param name="command">The command containing user update details.</param>
        //[HttpPut("Update")]
        //public async Task<IActionResult> UpdateUser([FromBody] UpdateUseryCommand updateUser)
        //{
        //    if (updateUser == null)
        //    {
        //        return BadRequest("User update data is required.");
        //    }

        //    var result = await _mediator.Send(updateUser);
        //    return result != null ? Ok(result) : StatusCode(500, "An error occurred while updating the user.");
        //}

        //#endregion

        #region Toggle User Active Status

        /// <summary>
        /// Toggles the active status of a user.
        /// </summary>
        /// <param name="command">The command containing user ID and active status information.</param>

        [HttpPost("update-status")]
        public async Task<IActionResult> UpdateStatus([FromBody] UserStatusQuery userStatus)
        {
            if (userStatus == null)
            {
                return BadRequest("Active status data is required.");
            }

            var result = await _mediator.Send(userStatus);
            return Ok(result);
        }

        #endregion
    }
}
